#[J1BP](https://joeysoh.github.io/J1BP/?)

For Splitting Bills.

Using Vue, Vite, Vuetify, Pinia and Firebase.

Similar sites:

[Billzer](https://billzer.com/)
[KittySplit](https://www.kittysplit.com/en/)
[LetsPayTheBill.com](https://www.letspaythebill.com/)
[Allin](https://everyoneallin.com/bill-splitter/split-the-bills/)

Apps:

[Splittr](https://splittr.io/)
[Splitwise](https://www.splitwise.com/)
[Tab](https://tabapp.co/)
[youchamp](https://youchampapp.com/)
[equiTable](https://equitableapp.com/)
[Evenfy](https://www.evenfy.com/en-us/)


## Setup firebase firestore in firebase.js in the same folder as main.js first before running.

    import { initializeApp } from "firebase/app";
    import { getAnalytics } from "firebase/analytics";
    import { getFirestore } from "firebase/firestore";

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
    apiKey: "api key here",
    authDomain: "authDomain.firebaseapp.com",
    projectId: "project id generated from firebase site",
    storageBucket: "project storage bucket.appspot.com",
    messagingSenderId: "messaging sender id",
    appId: "app id",
    measurementId: "measurement id"
    };

    const app = initializeApp(firebaseConfig);
    // Initialize Cloud Firestore and get a reference to the service
    const db = getFirestore(app);
    export default db;
