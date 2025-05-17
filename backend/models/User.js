// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ["owner", "admin"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: { // In a real app, HASH THIS PASSWORD!
    type: String,
    required: true,
  },
}, { timestamps: true });

UserSchema.virtual('id').get(function(){
    return this._id.toHexString();
});
UserSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) { delete ret._id; delete ret.__v; }
});

module.exports = mongoose.model("User", UserSchema);