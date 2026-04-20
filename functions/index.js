const functions = require("firebase-functions");

// Limit containers for cost control
functions.runWith({ maxInstances: 10 });

// This function will receive Supabase events
exports.userUpdateWebhook = functions.https.onRequest((req, res) => {
  console.log("Received event:", req.body);
  res.status(200).send("OK");
});
