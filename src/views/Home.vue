<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRouter} from 'vue-router'
import { useStore } from "./../store.js";
import crc from 'crc';




//firebase
import db from './../firebase'; //add firebase.js. refer to https://firebase.google.com/docs/firestore/quickstart web modular API to define db using getFirestore
import { collection, addDoc, getDocs, getDoc, doc} from "firebase/firestore"; 

const store = useStore();// cannot destructure from object when declaring, have to reference via store.<variable/function>
const router = useRouter() //composition api reference
const hasData = ref(false);
const valid = ref(false);
const rulesCount = ref([   
        value => {
          if (value) return true
          return 'Number is required.'
        },
        value => {
          if (value > 1 && value <10) return true
          return '2 - 9 only.'
        }
]);

onBeforeMount(() => {  
  const params = (new URL(location)).searchParams;
  var fullpath = window.location.href.substring(0,window.location.href.lastIndexOf("/"));
  var data = params.get("data");  
  var share = params.get("share");     

  store.setFullPath(fullpath);  
  if(data){
    var arrNames = [];
    var arrFood = [];
    var arrCost = [];
    var arrShare = [];
    var strCRC = '';
    var arr = data.replaceAll('é'," ").split('`'); 
    console.log(arr);
    if(arr.length == 5){
      arrNames = arr[0].split("~");
      arrFood = arr[1].split("~");
      arrCost = arr[2].split("~");
      arrShare = arr[3].split("~");
      strCRC =  arr[4];

      if(crc.crc16(arrNames.join("~") + "`" + arrFood.join("~") + "`" + arrCost.join("~") + "`" + arrShare.join("~")).toString() == strCRC){
        var arrPersons = [];
        for(var i = 0; i< arrNames.length; i++){
          var p = {name: arrNames[i], arrFoodItems: [], newFood : "", newCost: 0};
          if(arrFood.length - 1 >= i){        
            var _arrFoodItems = arrFood[i].split('°');
            var _arrCostItems = arrCost[i].split('°');
            var _arrShareItems = arrShare[i].split('°');
            for(var j = 0; j < _arrFoodItems.length; j++){          
              p.arrFoodItems.push({
                food: _arrFoodItems[j]
                ,cost: parseFloat(_arrCostItems[j])
                , showShare: false
                , arrShare: _arrShareItems[j].split(",").map(Number)
                , per: _arrCostItems[j] ? Math.round((parseFloat(_arrCostItems[j]) / _arrShareItems[j].length) * 100)/100 : 0
              });
            }
          }
          arrPersons.push(p);
        }      
        store.setData(arrPersons);
        router.push('/details'); 
      } 
    }
  } else if(share){
    hasData.value = true;
    getShareData(share,hasData);
  }
})


async function readSnapShot(){
  const querySnapshot = await getDocs(collection(db, "data"));
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} => ${doc.data()}`);
  });
}

async function getShareData(share,hasData){
  console.log("get data " + share);
  const docRef = doc(db, "data", share); 
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    store.setData(docSnap.data().arrPersons);      
    router.push('/details');
  } else {
    // docSnap.data() will be undefined in this case    
    hasData.value = false;
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
  <v-form v-model="valid">
    <v-container v-if="hasData" class="bg-surface-variant ma-1">
      <v-row>
          <v-col cols="12">
            <v-sheet class="flex-1-1-100 ma-0 pa-0">
              Please wait...
            </v-sheet>
          </v-col>
        </v-row>
    </v-container>
    <v-container v-else 
        class="bg-surface-variant ma-1">  
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
              v-model="store.iCountPersons"
              :rules="rulesCount"/>                         
        <v-btn  @click="store.decrementPersons()" icon="$minus" density="compact"/>
        <v-btn @click="store.incrementPersons()" icon="$plus" density="compact"/>
        <v-btn @click="goToDetails" density="compact" :disabled="!valid">GO!</v-btn>
      </v-row>
    </v-container>
  </v-form>
</template>