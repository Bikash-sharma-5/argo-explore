// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import connectDB from "./config/db.js";
// import dataRoutes from "./routes/dataRoutes.js";
// import axios from "axios"; // For calling LLM API
// import Profile from "./models/Profile.js"; // Mongoose model for ARGO profiles

// dotenv.config();
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use("/api/data", dataRoutes);

// // Chat endpoint (RAG + Gemini LLM → MongoDB query → results)
// app.post("/api/chat/query", async (req, res) => {
//   const { query } = req.body;

//   try {
//     // 1️ Send query to Gemini API to generate MongoDB filter
//     const llmResponse = await axios.post(
//       "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
//       {
//         contents: [
//           {
//             parts: [
//               {
//                 text: `Convert this natural language query into a MongoDB filter object:\n"${query}"\nReturn JSON only.`
//               }
//             ]
//           }
//         ]
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-goog-api-key": process.env.GEMINI_API_KEY
//         }
//       }
//     );

//     // 2️ Log the full response for debugging
//     console.log("LLM response:", JSON.stringify(llmResponse.data, null, 2));

//     // 3️ Parse filter JSON safely
//     let filterJSON = "";
//     let filter = {};

//     const candidates = llmResponse?.data?.candidates;
//     if (!candidates || candidates.length === 0) {
//       throw new Error("No candidates returned by Gemini API");
//     }

//     const content = candidates[0]?.content;
//     if (!content || !content.parts || content.parts.length === 0) {
//       throw new Error("No content parts in Gemini candidate");
//     }

//     filterJSON = content.parts[0].text;
//     if (!filterJSON) {
//       throw new Error("No text in content part");
//     }

//     // Remove markdown code fences if present
//     filterJSON = filterJSON.replace(/```json|```/g, "").trim();

//     try {
//       filter = JSON.parse(filterJSON); // Convert to MongoDB filter object
//       console.log("Parsed MongoDB filter:", filter);
//     } catch (err) {
//       console.error("Error parsing JSON from Gemini content:", err);
//       return res.status(400).json({ error: "Invalid filter returned by LLM" });
//     }
// if (filter.latitude !== undefined) {
//   filter.lat = filter.latitude;
//   delete filter.latitude;
// }

// if (filter.longitude !== undefined) {
//   filter.lon = filter.longitude;
//   delete filter.longitude;
// }
//     // 4️ Query MongoDB with the generated filter
//     const results = await Profile.find(filter).limit(100); // Limit results for safety
//     console.log(`Found ${results.length} profiles matching filter`);

//     // 5️ Send results back
//     res.json({ query, results });

//   } catch (error) {
//     console.error("Error processing chat query:", error.message || error);
//     res.status(500).json({ error: "Failed to process chat query" });
//   }
// });

// // Start Server
// const PORT = process.env.PORT || 5000;
// connectDB().then(() => {
//   app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
// });
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import dataRoutes from "./routes/dataRoutes.js";
import axios from "axios";
import Profile from "./models/Profile.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/data", dataRoutes);

// Helper: normalize LLM filter to match Profile schema
const normalizeFilter = (filter) => {
  // Latitude / Longitude
  if (filter.latitude !== undefined) {
    filter.lat = Number(filter.latitude);
    delete filter.latitude;
  }
  if (filter.longitude !== undefined) {
    filter.lon = Number(filter.longitude);
    delete filter.longitude;
  }

  // Handle $near operators by converting to a small range
  ["lat", "lon"].forEach((key) => {
    if (filter[key] && typeof filter[key] === "object" && filter[key].$near !== undefined) {
      const val = Number(filter[key].$near);
      const range = 0.4; // ±0.01 tolerance (~1 km)
      filter[key] = { $gte: val - range, $lte: val + range };
    }
  });

  // Time range conversion
  if (filter.timeRange) {
    const [start, end] = filter.timeRange;
    filter.time = {
      $gte: Number(start),
      $lte: Number(end),
    };
    delete filter.timeRange;
  }

  // If filter.time has $date objects, convert
  if (filter.time) {
    ["$gte", "$lte"].forEach((k) => {
      if (filter.time[k] && filter.time[k].$date) {
        if (filter.time[k].$date.$numberLong) {
          filter.time[k] = Number(filter.time[k].$date.$numberLong);
        } else {
          filter.time[k] = Number(filter.time[k].$date);
        }
      }
    });
  }

  return filter;
};

app.post("/api/chat/query", async (req, res) => {
  const { query } = req.body;

  try {
    // 1️⃣ Convert natural language → MongoDB filter via LLM
    const llmFilterResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: `You are helping query a MongoDB collection of ARGO ocean profiles. 
Each profile has: { lat:Number, lon:Number, time:Number, temperature:[Number], pressure:[Number], salinity:[Number] }.
Convert this natural query into a valid MongoDB filter JSON object only:
"${query}" 
Return JSON only.`
              }
            ]
          }
        ]
      },
      { headers: { "Content-Type": "application/json", "X-goog-api-key": process.env.GEMINI_API_KEY } }
    );

    const candidates = llmFilterResponse?.data?.candidates || [];
    if (!candidates.length) throw new Error("No candidates from Gemini");

    let filterJSON = (candidates[0]?.content?.parts?.[0]?.text || "").replace(/```json|```/g, "").trim();
    if (!filterJSON) throw new Error("Gemini returned empty filter");

    let filter;
    try {
      filter = JSON.parse(filterJSON);
    } catch {
      return res.status(400).json({ error: "Invalid JSON returned by LLM", raw: filterJSON });
    }

    // 2️ Normalize filter
    filter = normalizeFilter(filter);
    console.log("Normalized MongoDB filter:", filter);
    // 3️ Run MongoDB query
    const results = await Profile.find(filter).limit(50).lean();
    console.log(`Found ${results.length} profiles`);

    // 4️ Send results to LLM for human-readable summary
    let summary = "No profiles found.";
    if (results.length > 0) {
      try {
        const llmSummaryResponse = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          {
            contents: [
              {
                parts: [
                  {
                    text: `I have these ARGO profiles data:\n${JSON.stringify(results)} and user queries like "${query}". give answers fron this data for this query in professional way
Summarize them in a clear, human-readable way. Highlight key info such as average temperature, salinity, pressure, locations, times, and notable patterns.
Return a JSON object: { "summary": "..." } only.`
                  }
                ]
              }
            ]
          },
          { headers: { "Content-Type": "application/json", "X-goog-api-key": process.env.GEMINI_API_KEY } }
        );

        console.log("LLM summary full response:", JSON.stringify(llmSummaryResponse.data, null, 2));

        const summaryText = llmSummaryResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanSummary = summaryText.replace(/```json|```/g, "").trim();
        try {
          summary = JSON.parse(cleanSummary).summary || cleanSummary;
        } catch {
          summary = cleanSummary; // fallback if not proper JSON
        }
      } catch (err) {
        console.error("LLM summarization failed:", err);
      }
    }

    // 5️ Return results + summary
    res.json({ query, appliedFilter: filter, count: results.length, results, summary });

  } catch (error) {
    console.error("Error processing chat query:", error);
    res.status(500).json({ error: "Failed to process chat query", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
});
