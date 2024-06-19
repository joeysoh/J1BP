<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRouter} from 'vue-router'
import { useStore } from "./../store.js";

//firebase
import db from './../firebase'; //add firebase.js. refer to https://firebase.google.com/docs/firestore/quickstart web modular API to define db using getFirestore
import { collection, addDoc, getDocs, getDoc, doc} from "firebase/firestore"; 

const store = useStore();// cannot destructure from object when declaring, have to reference via store.<variable/function>
const router = useRouter() //composition api reference

onBeforeMount(() => {  
  const params = (new URL(location)).searchParams;
  var data = params.get("data");
  //data = JSON.parse(decodeURI(data));
  if(data){
    getData(data);    
  }
})


async function readSnapShot(){
  const querySnapshot = await getDocs(collection(db, "data"));
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} => ${doc.data()}`);
  });
}

async function getData(id){
  console.log("get data " + id);
  const docRef = doc(db, "data", id); 
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    store.setData(docSnap.data().arrPersons);  
    router.push('/details');
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
}
</script>
<script>
export default {
  methods: {
    goToDetails() {      
      this.$router.push('/details')
    },
  },
}
</script>
<template>      
    <v-container
        class="bg-surface-variant ma-4">  
        <v-row>
          <v-col cols="12">
            <v-sheet class="flex-1-1-100 ma-2 pa-2">
              How many people are in your group?  
            </v-sheet>
          </v-col>
        </v-row>
        <v-row>
              <v-text-field
                    density="compact"
                    placeholder="Persons"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                    v-model="store.iCountPersons"/>                         
              <v-btn  @click="store.decrementPersons()" icon="$minus" density="compact"/>
              <v-btn @click="store.incrementPersons()" icon="$plus" density="compact"/>
              <v-btn @click="goToDetails" density="compact"  >GO!</v-btn>
        </v-row>
  </v-container>
</template>