import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
    },
    lon: {
      type: Number,
      required: true,
    },
    time: {
      type: Number, // keep raw NetCDF timestamp; can convert later to Date
      required: true,
    },
    temperature: {
      type: [Number], // array of numbers
      required: true,
    },
    pressure: {
      type: [Number], // array of numbers
      required: true,
    },
    salinity: {
      type: [Number], // array of numbers (optional, since your snippet didn’t show data)
      default: [],
    },
    metadata: {
      type: Object, // optional extra info like sensor id, quality flags, etc.
      default: {},
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

export default mongoose.model("Profile", profileSchema);
