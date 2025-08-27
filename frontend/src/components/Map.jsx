import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const Map = ({ profiles, formatArray, onProfileClick }) => {
  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {profiles.map((profile, idx) => (
        <Marker
          key={idx}
          position={[profile.lat, profile.lon]}
          eventHandlers={{
            click: () => onProfileClick(profile),
          }}
        >
          <Popup>
            <div>
              <strong>ID:</strong> {profile._id || idx} <br />
              <strong>Temperature:</strong> {formatArray(profile.temperature)} <br />
              <strong>Pressure:</strong> {formatArray(profile.pressure)} <br />
              <strong>Salinity:</strong> {formatArray(profile.salinity)}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
