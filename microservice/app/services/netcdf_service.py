import xarray as xr
import tempfile

async def process_netcdf(file):
    try:
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        ds = xr.open_dataset(tmp_path)
        return {var: str(ds[var].values.tolist()[:5]) for var in ds.variables}
    except Exception as e:
        return {"error": str(e)}
