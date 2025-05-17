// backend/models/Property.js
const mongoose = require("mongoose");

const PaymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // Ideally: type: Date
  status: { type: String, enum: ["Paid", "Failed"], default: "Paid" },
}, { _id: true }); // Mongoose will auto-create _id

PaymentHistorySchema.virtual('id').get(function(){ return this._id.toHexString(); });
PaymentHistorySchema.set('toJSON', { virtuals: true, transform: function (doc, ret) { delete ret._id; } });


const NotificationMessageSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Ideally: type: Date
  message: { type: String, required: true },
}, { _id: true });

NotificationMessageSchema.virtual('id').get(function(){ return this._id.toHexString(); });
NotificationMessageSchema.set('toJSON', { virtuals: true, transform: function (doc, ret) { delete ret._id; } });


const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  flatNo: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // HASH THIS!
  paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
  rentAmount: { type: Number, required: true },
  lastNotify: { type: String }, // Ideally: type: Date
  paymentHistory: [PaymentHistorySchema],
  notifiedMessages: [NotificationMessageSchema],
}, { _id: true });

TenantSchema.virtual('id').get(function(){ return this._id.toHexString(); });
TenantSchema.set('toJSON', { virtuals: true, transform: function (doc, ret) { delete ret._id; } });


const MaintenanceRequestSchema = new mongoose.Schema({
  flatNo: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Resolved"], default: "Pending" },
  date: { type: String, required: true }, // Ideally: type: Date
  remarks: { type: String, default: "" },
}, { _id: true });

MaintenanceRequestSchema.virtual('id').get(function(){ return this._id.toHexString(); });
MaintenanceRequestSchema.set('toJSON', { virtuals: true, transform: function (doc, ret) { delete ret._id; } });


const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional link to User
  tenants: [TenantSchema],
  maintenanceRequests: [MaintenanceRequestSchema],
}, { timestamps: true });

PropertySchema.virtual('id').get(function(){
    return this._id.toHexString();
});
PropertySchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) { delete ret._id; delete ret.__v; }
});

module.exports = mongoose.model("Property", PropertySchema);