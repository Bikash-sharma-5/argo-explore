import { useEffect, useState, useRef } from "react";
import { MessageCircle } from "lucide-react";
import Map from "./components/Map";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./App.css";

function App() {
  const [allProfiles, setAllProfiles] = useState([]);
  const [displayProfiles, setDisplayProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/data/profiles");
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        const validProfiles = data.filter(
          (p) => p?.lat !== undefined && p?.lon !== undefined
        );
        setAllProfiles(validProfiles);
        setDisplayProfiles(validProfiles);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const formatArray = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return "N/A";
    return (
      arr
        .slice(0, 5)
        .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
        .join(", ") + (arr.length > 5 ? ", ..." : "")
    );
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { role: "user", text: chatInput }]);
    setChatLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatInput }),
      });
      const data = await res.json();

      const summary =
        data.summary || `Found ${data.count || 0} profiles matching your query.`;
      setChatMessages((prev) => [...prev, { role: "bot", text: summary }]);

      if (data.results && data.results.length > 0) {
        const valid = data.results.filter(
          (p) => p.lat !== undefined && p.lon !== undefined
        );
        setDisplayProfiles(valid);
      } else {
        setDisplayProfiles([]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Error processing query." },
      ]);
    } finally {
      setChatLoading(false);
      setChatInput("");
    }
  };

  const chartData = selectedProfile
    ? selectedProfile.temperature.map((t, i) => ({
        index: i + 1,
        temperature: t,
        pressure: selectedProfile.pressure[i],
        salinity: selectedProfile.salinity[i],
      }))
    : [];

  return (
    <div className="app-container">
      <header className="header">
        <h1>Climate Insights Dashboard</h1>
      </header>

      <div className="main">
        {/* Left: Map + Chart */}
        <div className="map-section" style={{ flexDirection: "column", display: "flex" }}>
          {loading ? (
            <div className="status-msg">Loading profiles...</div>
          ) : error ? (
            <div className="status-msg error">{error}</div>
          ) : (
            <Map
              profiles={displayProfiles}
              formatArray={formatArray}
              onProfileClick={setSelectedProfile}
            />
          )}

       {selectedProfile && chartData.length > 0 && (
  <div style={{ marginTop: "10px", marginBottom: "5px", height: "280px" }}>
    <h3 style={{ marginBottom: "5px" }}>Profile Chart (Temperature vs Pressure & Salinity)</h3>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="index"
          label={{ value: "Depth Index", position: "insideBottom", offset: -5 }}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#ff7300"
          name="Temperature"
        />
        <Line type="monotone" dataKey="pressure" stroke="#387908" name="Pressure" />
        <Line type="monotone" dataKey="salinity" stroke="#8884d8" name="Salinity" />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}

        </div>

        {/* Right: Chat */}
        <div className="chat-box">
          <div className="chat-header">
            <MessageCircle size={20} />
            <span>Climate Bot</span>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.role === "user" ? "user" : "bot"}`}
              >
                <pre>{msg.text}</pre>
                <div className="timestamp">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
            {chatLoading && <div className="chat-loading">Climate Bot is typing...</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about ARGO profiles..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
