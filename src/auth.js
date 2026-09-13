import { ref } from 'vue';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

const currentUser = ref(null);

onAuthStateChanged(auth, (user) => {
  currentUser.value = user;
});

function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export { currentUser, signIn };
