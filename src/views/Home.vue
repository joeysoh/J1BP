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
        // value => {
        //   if (value > 1 && value <10) return true
        //   return '2 - 9 only.'
        // }
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
    var arrSVC = [];
    var arrGST = [];
    var fSVC = 0.00;
    var fGST = 0.00;
    var strCRC = '';
    var arr = decodeURIComponent(data).replaceAll('é'," ").split('`'); 
    console.log(arr);
    if(arr.length == 9){
      arrNames = arr[0].split("~");      
      arrSVC = arr[1].split("~");
      arrGST = arr[2].split("~");
      fSVC = arr[3];
      fGST = arr[4];
      arrFood = arr[5].split("~");
      arrCost = arr[6].split("~");
      arrShare = arr[7].split("~");
      strCRC =  arr[8];
      
      if(crc.crc16(arrNames.join("~") + "`" + arrSVC.join("~") + "`" + arrGST.join("~") + "`" + fSVC + "`" + fGST + "`" + arrFood.join("~") + "`" + arrCost.join("~") + "`" + arrShare.join("~")).toString() == strCRC){
        var arrPersons = [];
        store.fSVC = fSVC;
        store.fGST = fGST;
        arrSVC = arrSVC.map(x => x === '1');
        arrGST = arrGST.map(x => x === '1');
        store.showSVCGST = arrSVC.reduce((accumulator, currentValue) => accumulator || currentValue,false) || arrGST.reduce((accumulator, currentValue) => accumulator || currentValue,false);
        for(var i = 0; i< arrNames.length; i++){
          var p = {name: arrNames[i], hasSVC: arrSVC[i], hasGST: arrGST[i], arrFoodItems: [], newFood : "", newCost: null};
          if(arrFood.length - 1 >= i){        
            var _arrFoodItems = arrFood[i].split('°');
            var _arrCostItems = arrCost[i].split('°');
            var _arrShareItems = arrShare[i].split('°');
            for(var j = 0; j < _arrFoodItems.length; j++){
              p.arrFoodItems.push({
                food: _arrFoodItems[j]
                ,cost: parseFloat(_arrCostItems[j])
                , showShare: _arrShareItems[j].length == 0
                , arrShare: _arrShareItems[j].length == 0 ? [] : _arrShareItems[j].split(",").map(Number)
                , per: 0//_arrCostItems[j] ? Math.round((parseFloat(_arrCostItems[j]) / _arrShareItems[j].length) * 100)/100 : 0
                , totalCost:0
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
    store.iCountPersons = docSnap.data().iCountPersons;
    store.fGST = docSnap.data().fGST;
    store.fSVC = docSnap.data().fSVC;
    store.showSVCGST = docSnap.data().showSVCGST;
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
        <v-row class="flex-row" style="max-height: 40px;">
          <v-text-field
                @focus="$event.target.select()"
                density="compact"
                placeholder="Persons"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                v-model="store.iCountPersons"
                :rules="rulesCount"/>                         
          <!-- <v-btn class = "mt-1" @click="store.decrementPersons()" icon="$minus" density="compact"/>
          <v-btn class = "mt-1" @click="store.incrementPersons()" icon="$plus" density="compact"/> -->
          <v-btn class = "ml-4 pa-0" style="height: 38px;" @click="goToDetails" density="compact" :disabled="!valid">GO!</v-btn>
        </v-row>
        <br/><br/>
        <v-row class="flex-row" style="max-height: 40px;">
        <v-checkbox label="show Service (SVC) & GST Charge (GST)" density="compact" v-model="store.showSVCGST" class="ma-0 pa-0"></v-checkbox>
      </v-row>
    </v-container>
  </v-form>
</template>