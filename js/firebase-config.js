// =============================================
// SHARED FIREBASE CONFIGURATION
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyDG1fBMvyAmmk7qNBH-mRKAX1OCd3ouKUk",
    authDomain: "artisansmarket-5f2b6.firebaseapp.com",
    projectId: "artisansmarket-5f2b6",
    storageBucket: "artisansmarket-5f2b6.firebasestorage.app",
    messagingSenderId: "89551898663",
    appId: "1:89551898663:web:1891c4639d293c861e2602"
};

// Initialize primary Firebase app
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Secondary app instance for admin creation (avoids signing out current user)
let secondaryApp;
if (!firebase.apps.find(app => app.name === 'Secondary')) {
    secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary');
} else {
    secondaryApp = firebase.app('Secondary');
}
const secondaryAuth = secondaryApp.auth();

console.log("Firebase initialized successfully");
