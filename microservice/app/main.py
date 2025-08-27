# # app.py
# from fastapi import FastAPI, UploadFile, File
# import uvicorn
# import xarray as xr
# import tempfile
# import httpx

# app = FastAPI()

# # Backend API endpoint
# BACKEND_API = "http://localhost:5000/api/data/profiles"

# @app.post("/upload-netcdf/")
# async def upload_netcdf(file: UploadFile = File(...)):
#     try:
#         # Save file temporarily
#         with tempfile.NamedTemporaryFile(delete=False) as tmp:
#             tmp.write(await file.read())
#             tmp_path = tmp.name

#         # Open dataset with xarray
#         ds = xr.open_dataset(tmp_path)

#         # Extract coordinates/variables safely
#         lat = ds.coords.get("lat")
#         if lat is None:
#             lat = ds.coords.get("latitude")

#         lon = ds.coords.get("lon")
#         if lon is None:
#             lon = ds.coords.get("longitude")

#         time_coord = ds.coords.get("time")

#         temp = ds.variables.get("temperature")
#         if temp is None:
#             temp = ds.variables.get("temp")

#         # Build structured data safely
#         parsed_data = {
#             "lat": lat.values.tolist() if lat is not None else [],
#             "lon": lon.values.tolist() if lon is not None else [],
#             "time": time_coord.values.tolist()[:10] if time_coord is not None else [],
#             "temperature": temp.values.flatten().tolist()[:10] if temp is not None else []
#         }
#          # convert parsed_data to array of profiles
#         profiles = []
#         n = len(parsed_data["temperature"])
#         for i in range(n):
#             profiles.append({
#                 "lat": parsed_data["lat"][i % len(parsed_data["lat"])],
#                 "lon": parsed_data["lon"][i % len(parsed_data["lon"])],
#                 "time": parsed_data["time"][i % len(parsed_data["time"])],
#                 "temperature": parsed_data["temperature"][i]
#             })

#         # Send to backend for saving in MongoDB
#         async with httpx.AsyncClient() as client:
#             response = await client.post(BACKEND_API, json=profiles)
#             try:
#                backend_resp = response.json()
#             except ValueError:
#                backend_resp = {"error": "Backend returned no JSON"}

#         return {
#             "status": "success",
#             "preview": parsed_data,
#             "backend_response": backend_resp
#         }

#     except Exception as e:
#         return {"error": str(e)}


# if __name__ == "__main__":
#     uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
# app.py
from fastapi import FastAPI, UploadFile, File
import uvicorn
import xarray as xr
import tempfile
import httpx
import pandas as pd
import numpy as np

app = FastAPI()

# Backend API endpoint
BACKEND_API = "http://localhost:5000/api/data/profiles"


def safe_get(ds, *keys):
    """Try multiple possible keys safely without triggering array truth errors."""
    for key in keys:
        if key in ds.variables:
            return ds[key]
        if key in ds.coords:
            return ds.coords[key]
    return None


def extract_array(var, i=None):
    """Handle both 1D and 2D arrays (Masked or normal)."""
    if var is None:
        return []
    vals = var.values
    if isinstance(vals, np.ma.MaskedArray):
        vals = vals.filled(np.nan)

    if vals.ndim == 1:  # [N_LEVELS]
        return vals.tolist()
    elif vals.ndim == 2:  # [N_PROF, N_LEVELS]
        return vals[i, :].tolist() if i is not None else vals[0, :].tolist()
    else:
        return []


@app.post("/upload-netcdf/")
async def upload_netcdf(file: UploadFile = File(...)):
    try:
        # ---- Save file temporarily ----
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # ---- Open dataset ----
        ds = xr.open_dataset(tmp_path)

        print("\n=== DATASET SUMMARY ===")
        print(ds)

        # ---- Detect Argo Standard Variables ----
        lat = safe_get(ds, "LATITUDE", "lat", "latitude")
        lon = safe_get(ds, "LONGITUDE", "lon", "longitude")
        juld = safe_get(ds, "JULD", "time")
        temp = safe_get(ds, "TEMP", "temperature", "temp")
        pres = safe_get(ds, "PRES")
        psal = safe_get(ds, "PSAL")

        # ---- Convert time ----
        time_values = []
        if juld is not None:
            try:
                parsed_times = pd.to_datetime(juld.values, origin="1950-01-01", unit="D")
                time_values = [t.strftime("%Y-%m-%dT%H:%M:%SZ") for t in parsed_times]
            except Exception:
                time_values = juld.values.tolist()

        # ---- Build Profiles ----
        profiles = []
        n_prof = ds.dims.get("N_PROF", 1)

        for i in range(n_prof):
            profile = {
                "lat": float(lat.values[i]) if lat is not None and lat.ndim > 0 else float(lat.values) if lat is not None else None,
                "lon": float(lon.values[i]) if lon is not None and lon.ndim > 0 else float(lon.values) if lon is not None else None,
                "time": time_values[i] if i < len(time_values) else None,
                "temperature": extract_array(temp, i),
                "pressure": extract_array(pres, i),
                "salinity": extract_array(psal, i),
            }
            profiles.append(profile)

        ds.close()

        # ---- Send to backend ----
        async with httpx.AsyncClient() as client:
            response = await client.post(BACKEND_API, json=profiles)
            try:
                backend_resp = response.json()
            except ValueError:
                backend_resp = {"error": "Backend returned no JSON"}

        return {
            "status": "success",
            "preview": profiles[:2],  # first 2 profiles as preview
            "backend_response": backend_resp,
        }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
