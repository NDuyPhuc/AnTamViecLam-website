/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.sendPushNotification = onCall(async (request) => {
  logger.info("sendPushNotification triggered", {requestData: request.data});

  // 1. Check authentication and data validity
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const {recipientId, senderName, messageText} = request.data;
  if (!recipientId || !senderName || !messageText) {
    throw new HttpsError("invalid-argument", "The function must be called with recipientId, senderName, and messageText.");
  }

  try {
    // 2. Get the recipient's FCM tokens from Firestore
    const userDoc = await admin.firestore().collection("users").doc(recipientId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", `User document with ID ${recipientId} not found.`);
    }

    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens;

    if (!fcmTokens || fcmTokens.length === 0) {
      logger.info(`User ${recipientId} has no FCM tokens.`);
      return {success: false, message: "User has no FCM tokens."};
    }

    // 3. Construct the notification payload
    const payload = {
      notification: {
        title: `Tin nhắn mới từ ${senderName}`,
        body: messageText,
      },
      // You can add 'data' for custom payload handling on the client
      // data: {
      //   conversationId: "...",
      // }
    };

    // 4. Send the notification using Admin SDK
    logger.info(`Sending notification to tokens:`, fcmTokens);
    const response = await admin.messaging().sendToDevice(fcmTokens, payload);
    logger.info("Successfully sent message:", response);

    // Optional: Clean up invalid tokens
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        logger.error("Failure sending notification to", fcmTokens[index], error);
        if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
          tokensToRemove.push(fcmTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await admin.firestore().collection("users").doc(recipientId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
      logger.info("Removed invalid tokens:", tokensToRemove);
    }


    return {success: true, message: "Notification sent successfully."};
  } catch (error) {
    logger.error("Error sending push notification:", error);
    throw new HttpsError("internal", "An error occurred while sending the notification.", error);
  }
});
