<script setup>
import { useStore } from "./../store.js";
import { useRouter, useRoute} from 'vue-router'
import {onBeforeMount, onMounted, ref, computed, watch } from 'vue'
import QRCode from 'qrcode'
import crc from 'crc';


//firebase
import db from './../firebase';
import { collection, addDoc, getDocs, getDoc, doc} from "firebase/firestore"; 

const router = useRouter() //composition api reference
const showQR = ref(false);
const store = useStore();
const colorRequired = "purple-lighten-4";
const data = store.data;
const canvas = ref(null);
var arrPersons = ref([]);

function linkCopy(){  
  var url = '';
  if(linkURL.value){
    url = linkURL.value
  } else {
    url = window.location.href;
  }
  console.log(`copied to clipboard: ${url}`);
  navigator.clipboard.writeText(url);     
}

function removeInvalidChar(arr){  
  for(var i = 0; i < arr.length; i++){
    if(typeof(arr[i]) === "string"){
      arr[i] = arr[i].replaceAll("~","-").replaceAll("`","'").replaceAll("°","º").replace('é','e');
    } else if(Array.isArray(arr[i])){
      removeInvalidChar(arr[i]);
    }
  }
}


const linkURL = computed(()=>{
  var arrNames = [];
  var arrFood = [];
  var arrCost = [];
  var arrShare = [];
  var arrSVC = [];
  var arrGST = [];
  var _arrPersons = arrPersons.value.toSorted(
    function(a,b){
      return (b.arrFoodItems.length - a.arrFoodItems.length);
    }
  );
  for(var i = 0; i < _arrPersons.length; i++){
    arrNames.push(_arrPersons[i].name);
    arrSVC.push(_arrPersons[i].hasSVC?1:0);
    arrGST.push(_arrPersons[i].hasGST?1:0);

    if(_arrPersons[i].arrFoodItems.length > 0){
      var _arrFood = [];
      var _arrCost = [];
      var _arrShare = [];
      for(var j = 0; j < _arrPersons[i].arrFoodItems.length; j++){      
          _arrFood.push(_arrPersons[i].arrFoodItems[j].food);
          _arrCost.push(Math.round(_arrPersons[i].arrFoodItems[j].cost * 100)/100);
          _arrShare.push(_arrPersons[i].arrFoodItems[j].arrShare);  
          
      }
      removeInvalidChar(_arrFood);
      removeInvalidChar(_arrCost);
      arrFood.push(_arrFood.join("°"));
      arrCost.push(_arrCost.join("°"));
      arrShare.push(_arrShare.join("°"));
    }
  }
  removeInvalidChar(arrNames);  
  var data = arrNames.join("~") + "`" + arrSVC.join("~") + "`" + arrGST.join("~") + "`" + store.fSVC + "`" + store.fGST + "`" + arrFood.join("~") + "`" + arrCost.join("~") + "`" + arrShare.join("~");
  data = data + "`" + crc.crc16(data).toString();  
  data = data.replaceAll(" ","é");
  return `${store.fullpath}/?data=${encodeURIComponent(data)}`;
});

async function linkShare(){  
  try {
    const docRef = await addDoc(collection(db, "data"), {
      arrPersons : arrPersons.value
    });
    var url = `${store.fullpath}/?share=${docRef.id}`;
    console.log(`url: ${url}`);
    console.log("Document written with ID: ", docRef.id);
    window.open(`https://wa.me/?text=${url}`);
  } catch (e) {
    console.error("Error adding document: ", e);
  }  
}

function sumArrayAttribute(items, prop){
    return items.reduce( function(a, b){
        return a + b[prop];
    }, 0);
};

const arrTotalCost = computed(()=>{
  var arr = [];
  for(var i = 0; i < arrPersons.value.length; i++){
    arr.push(sumArrayAttribute(arrPersons.value[i].arrFoodItems, "totalCost"));
  }
  return arr;
})

const arrCalculate = computed(() =>{  
  var arrPersonPayPerson = [];

  for(var i = 0; i < arrPersons.value.length; i++){
    var arrPay = Array(arrPersons.value.length).fill(0);
    arrPersonPayPerson.push(arrPay);    
  }

  for(var i = 0; i < arrPersons.value.length; i++){ //for each person    
    for(var j = 0; j < arrPersons.value[i].arrFoodItems.length; j++){ //for each food item paid by person         
      var per = 0;
      var svc = 0.00;
      var gst = 0.00;
      var arrShare = arrPersons.value[i].arrFoodItems[j].arrShare;
      console.log(`per: ${per} share count: ${arrShare.length}`);
      if(arrShare.length> 0){        
        per = arrPersons.value[i].arrFoodItems[j].cost / arrShare.length; //get per person cost by dividing cost of food over # of people
        svc = (store.fSVC / 100 * per) * (arrPersons.value[i].hasSVC?1:0);//svc amount from per * svc charge, if svc not checked, 0
        gst = (store.fGST / 100 * (per + svc)) * (arrPersons.value[i].hasGST?1:0);        
        console.log(`per:${per} svc: ${svc} gst: ${gst} total per: ${per + svc + gst}`);
        per = per + svc + gst;
        arrPersons.value[i].arrFoodItems[j].per = per;      
        arrPersons.value[i].arrFoodItems[j].totalCost = per * arrShare.length;
        for(var k = 0; k < arrShare.length; k++){ //for each person who shared the food
          if(arrShare[k] != i){//excluding person who paid
            arrPersonPayPerson[arrShare[k]][i] += per;//person who shares food, has amount in array position for person who paid, added with cost of food per person
          }
        }        
      } else {
        per = arrPersons.value[i].arrFoodItems[j].cost;        
      }
    }
  }

  for(var i = 0; i < arrPersonPayPerson.length - 1; i++){ //first to 2nd last, since the last one doesn't need to be iterated.
    var arrPay = arrPersonPayPerson[i];
    for(var j = i + 1; j < arrPersonPayPerson.length; j++){
      var diff = arrPersonPayPerson[j][i] - arrPersonPayPerson[i][j];
      if(diff < 0){
        arrPersonPayPerson[j][i] = 0;
        arrPersonPayPerson[i][j] = diff * -1;        
      } else {
        arrPersonPayPerson[j][i] = diff;
        arrPersonPayPerson[i][j] = 0;       
      }
    }
  }
  
  return arrPersonPayPerson;
});

onBeforeMount(() => {
})

onMounted(() => {
  if(data){    
    arrTotalCost.effect.run();
    arrCalculate.effect.run();
    linkURL.effect.run();        
  }
})

function goToHome(){  
  router.push('/') 
}

watch(canvas, async(newCanvas,oldCanvas) => {
  if(newCanvas){
    var url = '';
    if(linkURL.value){
      url = linkURL.value
    } else {
      url = window.location.href;
    }
    QRCode.toCanvas(newCanvas, url, function (error) {
    if (error) 
      console.error(error)
      console.log('qr code error');
      console.log(url);
    })
  }
});

function addPerson() {
  arrPersons.value.push({name: "Name " + (arrPersons.value.length + 1), hasGST: false, hasSVC:false, arrFoodItems: [], newFood : null, newCost: null});
}

function removeFood(indexPerson, indexFood){
  arrPersons.value[indexPerson].arrFoodItems.splice(indexFood,1);
}

function toggleShare(indexPerson, indexFood){
  arrPersons.value[indexPerson].arrFoodItems[indexFood].showShare = !arrPersons.value[indexPerson].arrFoodItems[indexFood].showShare;
}

function addFood(index) {
  arrPersons.value[index].arrFoodItems.push({
    food: arrPersons.value[index].newFood
    , cost: parseFloat(arrPersons.value[index].newCost)
    , showShare: false, arrShare:[...Array(arrPersons.value.length).keys()]
    , per:0
    , totalCost:parseFloat(arrPersons.value[index].newCost)
  });//per, totalCost, svc and gst to be computed by arrCalculate 
  arrPersons.value[index].newFood = null;
  arrPersons.value[index].newCost = null;
}

onBeforeMount(() => {      
  if(data){    
    arrPersons = ref(data);    
  } else {
    arrPersons = ref([]);
    for(let  i = 0; i< store.iCountPersons; i++){
      addPerson();
    }  
  }
})
</script>

<template>
  <v-container>
    <v-row class="flex-row" style="max-height: 40px;">
      <span class="ma-0 pa-0 me-auto">
      {{ store.iCountPersons}}  People      
      </span>
      <span>
        <v-btn v-if="store.data" density="compact" variant="outlined">
          <v-icon icon="mdi-arrow-left" density="compact" style="width:10%"></v-icon>
          <a :href="store.fullpath" style="color:white"><v-icon density="compact" style="width:10%"></v-icon>Reset</a>
        </v-btn>
        <v-btn v-else @click="goToHome" density="compact" variant="outlined"><v-icon icon="mdi-arrow-left" density="compact" style="width:10%"></v-icon>Back</v-btn>                      
      </span>
    </v-row>                        
    
    <v-row v-show="store.showSVCGST" class="flex-row">      
      <span class="mt-2" density="compact">Svc</span>
      <v-text-field style="max-width:100px;max-height: 40px;"
          :oninput = "store.fSVC < 0 ? store.fSVC = 0 : (store.fSVC > 99 ? store.fSVC = 99 : store.fSVC = Math.round(store.fSVC))"
          class="mr-6 pa-0"
          :bg-color="store.fSVC > 0 ? 'none' : colorRequired"
          density="compact"
          placeholder="SVC"
          type="number"
          :max="99"
          :min="0"          
          append-inner-icon="mdi-percent"
          variant="outlined"
          v-model.number="store.fSVC"/>       
      
      <span class="mt-2" density="compact">GST</span>
    
      <v-text-field style="max-width:100px;max-height: 40px;"
          :oninput = "store.fGST < 0 ? store.fGST = 0 : (store.fGST > 99 ? store.fGST = 99 : store.fGST = Math.round(store.fGST))"
          class="ma-0 pa-0"
          :bg-color="store.fGST > 0 ? 'none' : colorRequired"
          density="compact"
          placeholder="GST"
          type="number"
          :max="99"
          :min="0"          
          append-inner-icon="mdi-percent"
          variant="outlined"
          v-model.number="store.fGST"/>      
    </v-row>    
  </v-container>

  <v-container class="bg-surface-variant ma-0"><v-form>
    <v-row>      
      <template v-for="(person, indexPerson) in arrPersons">        
        <v-sheet class="ma-1 pa-1" style="min-width: 300px">
          <v-container>
            <v-row class="flex-row" style="max-height: 40px;">
              <v-text-field @focus="$event.target.select()"
                        style="width:30%"
                        :bg-color="person.name?.length > 0 ? 'none' : colorRequired"
                        density="compact"
                        placeholder="Name"
                        prepend-inner-icon="mdi-account"
                        variant="outlined"
                        v-model="person.name"/> 
            </v-row>
            <v-row v-show="store.showSVCGST" class="flex-row" style="max-height: 40px;">
              <v-checkbox label="SVC" density="compact" v-model="person.hasSVC" class="ma-0 pa-0"></v-checkbox>
              <v-checkbox label="GST" density="compact" v-model="person.hasGST" class="ma-0 pa-0 me-auto"></v-checkbox>  
              <v-icon class="mt-2" icon="mdi-sigma"/><span class="mt-2" width="100%">{{ Math.round(sumArrayAttribute(person.arrFoodItems, 'totalCost')*100)/100 }}</span>              
            </v-row>
            <v-divider class="mt-3"/>
          </v-container>          
  
          <v-expand-transition group="true">
          <template v-for="(foodItem, indexFood) in person.arrFoodItems" v-bind:key="indexFood">            
              <v-container>                
                  <v-row class="flex-row" style="max-height: 40px;">                   
                      <v-btn class="mt-1" @click="toggleShare(indexPerson,indexFood)" icon="mdi-account-multiple" density="compact" :disabled="foodItem.arrShare.length<1" variant="outlined" :color="foodItem.arrShare.length == arrPersons.length ? 'none':'orange'"/>
                      <v-text-field style="width:30%"
                            :bg-color="foodItem.food?.length > 0 ? 'none' : colorRequired"
                            density="compact"
                            placeholder="Food"                            
                            variant="outlined"                            
                            v-model="foodItem.food"/> 
                            
                      <v-text-field style="width:30%"
                            :bg-color="foodItem.cost > 0 ? 'none' : colorRequired"
                            density="compact"
                            placeholder="Cost"
                            type="number"
                            prepend-inner-icon="mdi-currency-usd"
                            variant="outlined"
                            v-model.number="foodItem.cost"/>                                           
                    <v-btn class="mt-1" @click="removeFood(indexPerson,indexFood)" icon="$minus" density="compact" variant="outlined"/>                                                                     
                  </v-row>
              
                <v-expand-transition>
                <v-row v-if="foodItem.showShare">
                  <v-divider/>
                    <template v-for="(person, indexSharePerson) in arrPersons">
                      <v-sheet>
                        <v-checkbox :label="person.name" :value = "indexSharePerson" v-model="foodItem.arrShare" density="compact"></v-checkbox>                        
                      </v-sheet>
                    </template>                    
                    <v-text-field style="width:30%"
                        :bg-color="foodItem.arrShare.length > 0 ? 'none' : colorRequired"
                        density="compact"
                        prepend-inner-icon="mdi-account"
                        disabled = true                        
                        v-bind:value="foodItem.arrShare.length > 0 ? ('$' + foodItem.per ? Math.round(foodItem.per*100)/100 : 0) : 'Invalid'"/>
                    <v-divider/><!-- disabled textfield, due to alignment issues with interpolated text -->
                </v-row>             
              </v-expand-transition>                     
              </v-container>            
          </template>
          </v-expand-transition>

          <v-container>
            <v-row class="flex-row">
                <v-btn class="mt-2" @click="addFood(indexPerson)" icon="$plus" density="compact" variant="outlined" 
                    :disabled = "((person.newFood ?? '').trim() == '') || (person.newCost ?? 0) == 0"/>                
                <v-text-field style="width:30%"
                          :bg-color="person.newFood?.length > 0 || person.newCost > 0 ? colorRequired:'none'"
                          density="compact"
                          placeholder="Item Name"                          
                          variant="outlined"
                          v-model="person.newFood"/>
                <v-text-field style="width:30%"
                      :bg-color="person.newFood?.length > 0 || person.newCost > 0 ? colorRequired:'none'"
                      density="compact"
                      placeholder="Cost"
                      prepend-inner-icon="mdi-currency-usd"
                      type="number"
                      variant="outlined"
                      v-model.number="person.newCost"/>                
                  <v-btn class="mt-2" @click="person.newFood= null; person.newCost= null" icon="mdi-close" density="compact" variant="outlined" 
                    :disabled = "((person.newFood ?? '').trim() == '') && (person.newCost ?? 0 == 0)"/>       
              </v-row>
            </v-container>
            
        </v-sheet>
      </template>
    </v-row>
    <v-row v-show = "arrTotalCost.reduce((accumulator, currentValue) => accumulator + currentValue,0)>0">      
        <v-sheet color="teal-accent-1">
              Amount Owed:
              <template v-for="(arrPaymentAmount, indexPerson) in arrCalculate">
                <v-divider/>
                <v-expand-transition>
                  <v-sheet v-show = "arrCalculate[indexPerson].reduce((accumulator, currentValue) => accumulator + currentValue,0)> 0">
                    {{ arrPersons[indexPerson].name }}
                    <template v-for="(paymentAmount,indexPaymentAmount) in arrPaymentAmount">
                      
                        <div v-show ="indexPaymentAmount != indexPerson && paymentAmount > 0">{{ paymentAmount.toFixed(2) }} 
                          <v-icon icon="mdi-arrow-right-thin"></v-icon> 
                          {{ arrPersons[indexPaymentAmount].name }}</div>                    
                    </template>                
                  </v-sheet>   
                </v-expand-transition>          
              </template>           
        </v-sheet>           
      
      <v-btn density="compact" icon="mdi-content-copy" @Click = "linkCopy"></v-btn>
      <v-btn density="compact" icon="mdi-share-variant-outline" @Click = "linkShare"></v-btn>     
      <v-btn density="compact" icon="mdi-qrcode" @click = "showQR = !showQR; linkURL;"></v-btn>
      <!-- <v-sheet @click = "showQR = !showQR;" :elevation="24"  class="position-absolute top-0 left-0" v-show = "showQR" rounded
        height="100%" width="100%" color="teal-lighten-3">          
      </v-sheet> -->
    </v-row>        

    <v-dialog v-model="showQR" width="auto" @click = "showQR = !showQR;">
        <v-card>
          <canvas id="canvas" ref="canvas"></canvas>      
        </v-card>
    </v-dialog>    
  </v-form>
  
</v-container>  
      
      
</template>

<style scoped>
</style>