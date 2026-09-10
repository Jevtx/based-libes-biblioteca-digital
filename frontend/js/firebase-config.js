"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyCQXmlre_Za7_SngTPlomMJaPNhrSpViDY",
  authDomain: "biblioteca-14ecc.firebaseapp.com",
  projectId: "biblioteca-14ecc",
  storageBucket: "biblioteca-14ecc.firebasestorage.app",
  messagingSenderId: "452196628849",
  appId: "1:452196628849:web:1f134ecfa35c77457e5ed0",
};

if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
} else {
  console.warn(
    "SDK do Firebase não carregado — verifique se os scripts do " +
    "firebase-app e firebase-auth estão incluídos antes deste arquivo."
  );
}
