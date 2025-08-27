import Profile from "../models/Profile.js";

export const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

export const ingestProfiles = async (req, res) => {
  try {
    const items = req.body; // expect array of profile objects
    console.log("Ingesting profiles:", items);

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Expected an array of profiles" });
    }

    // ✅ Transform each profile before saving
    const transformedItems = items.map((item) => {
      let parsedTime = null;

      if (item.time) {
        // Some Argo datasets use nanoseconds since epoch → divide by 1e9
        // If microseconds, use 1e6 instead
        parsedTime = new Date(Number(item.time) / 1e9);
      }

      return {
        ...item,
        time: parsedTime || new Date(), // fallback to current time
      };
    });

    const inserted = await Profile.insertMany(transformedItems, { ordered: false });
    console.log(`Inserted ${inserted.length} profiles`);
    res.json({ insertedCount: inserted.length, inserted });
  } catch (err) {
    console.error("Ingest error:", err);
    res.status(500).json({ error: "Failed to ingest profiles", details: err.message });
  }
};
