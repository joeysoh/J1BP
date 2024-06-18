<script setup>
import { useStore } from "./../store.js";
import { useRouter, useRoute} from 'vue-router'
import {onBeforeMount, ref, computed } from 'vue'
const router = useRouter() //composition api reference
const route = useRoute() 
const store = useStore();
const colorRequired = "purple-lighten-4";
const data = store.data;
var arrPersons = ref([]);

function linkCopy(){
  var fullPath = window.location.href + "index.html";
  fullPath = fullPath.substring(0,fullPath.indexOf("/index.html"));
  navigator.clipboard.writeText(`${fullPath}/?data=${encodeURI(JSON.stringify(arrPersons.value))}`);     
}

function linkShare(){
  var fullPath = window.location.href + "index.html";
  fullPath = fullPath.substring(0,fullPath.indexOf("/index.html"));
  router.push(`https://wa.me/?text=$${fullPath}/?data=${encodeURI(JSON.stringify(arrPersons.value))}`);
}

function sumArrayAttribute(items, prop){
    return items.reduce( function(a, b){
        return a + b[prop];
    }, 0);
};

const arrTotalCost = computed(()=>{
  var arr = [];
  for(var i = 0; i < arrPersons.value.length; i++){
    arr.push(sumArrayAttribute(arrPersons.value[i].arrFoodItems, "cost"));
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
      var per = arrPersons.value[i].arrFoodItems[j].cost / arrPersons.value[i].arrFoodItems[j].arrShare.length; //get per person cost by dividing cost of food over # of people
      arrPersons.value[i].arrFoodItems[j].per = per;
      for(var k = 0; k < arrPersons.value[i].arrFoodItems[j].arrShare.length; k++){ //for each person who shared the food
        if(k != i){//excluding person who paid
          arrPersonPayPerson[arrPersons.value[i].arrFoodItems[j].arrShare[k]][i] += per;//person who shares food, has amount in array position for person who paid, added with cost of food per person
        }
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

  //console.log("computed " + new Date(8.64e15).toString());
  return arrPersonPayPerson;
});

function goToHome(){  
  router.push('/') 
}

function addPerson() {          
  arrPersons.value.push({name: "Name " + (arrPersons.value.length + 1), arrFoodItems: [], newFood : "", newCost: 0});
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
    , per: 0});
  console.log(arrPersons.value[index].arrFoodItems);
  arrPersons.value[index].newFood = "";
  arrPersons.value[index].newCost = 0;
}

onBeforeMount(() => {      
  if(data){
    arrPersons = ref(data);
    console.log(arrPersons.value);
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
    <v-row>
      <v-sheet class="px-6 mr-6">{{ store.iCountPersons }} Person(s)</v-sheet>
      <a href="/" v-if="store.data">Reset</a>
      <v-btn v-else @click="goToHome" density="compact">Back</v-btn>
    </v-row>
  </v-container>

  <v-container class="bg-surface-variant ma-0">
    <v-row>      
      <template v-for="(person, indexPerson) in arrPersons">        
        <v-sheet class="ma-1 pa-1" style="min-width: 300px">
          <v-container>
            <v-row class="flex-row">
            <v-text-field
                      style="width:30%"
                      :bg-color="person.name.length > 0 ? 'none' : colorRequired"
                      density="compact"
                      placeholder="Name"
                      prepend-inner-icon="mdi-account"
                      variant="outlined"
                      v-model="person.name"/> 
            <v-icon icon="mdi-sigma" density="compact" style="width:10%"></v-icon>
            {{ sumArrayAttribute(person.arrFoodItems, "cost") }}
            </v-row>
          </v-container>
          <template v-for="(foodItem, indexFood) in person.arrFoodItems">            
              <v-container>
                <v-row class="flex-row">
                  <v-text-field style="width:30%"
                        :bg-color="foodItem.food.length > 0 ? 'none' : colorRequired"
                        density="compact"
                        placeholder="Food"
                        prepend-inner-icon="mdi-silverware-fork-knife"
                        variant="outlined"
                        v-model="foodItem.food"/> 
                  
                  <v-text-field style="width:30%"
                        :bg-color="foodItem.cost > 0 ? 'none' : colorRequired"
                        density="compact"
                        placeholder="Cost"
                        type="number"
                        prepend-inner-icon="mdi-currency-usd"
                        variant="outlined"
                        v-model="foodItem.cost"/>                  
                  <v-btn @click="removeFood(indexPerson,indexFood)" icon="$minus" density="compact" variant="outlined"/>
                  <v-btn @click="toggleShare(indexPerson,indexFood)" icon="mdi-account-multiple" density="compact" variant="outlined" :color="foodItem.arrShare.length == arrPersons.length ? 'none':'orange'"/>
                </v-row>
                <v-row v-if="foodItem.showShare">
                  <v-divider/>
                    <template v-for="(person, indexSharePerson) in arrPersons">
                      <v-sheet>
                        <v-checkbox :label="person.name" :value = "indexSharePerson" v-model="foodItem.arrShare" :disabled = "indexPerson == indexSharePerson" density="compact"></v-checkbox>                        
                      </v-sheet>
                    </template>                    
                    <v-text-field style="width:30%"
                        density="compact"
                        prepend-inner-icon="mdi-account"
                        disabled = true                        
                        v-bind:value="'$' + Math.round(foodItem.per*100)/100"/>
                    <v-divider/><!-- disabled textfield, due to alignment issues with interpolated text -->
                </v-row>                                  
              </v-container>            
          </template>
        
          <v-text-field
                    :bg-color="person.newFood.length > 0 ? 'none' : colorRequired"
                    density="compact"
                    placeholder="Food"
                    prepend-inner-icon="mdi-silverware-fork-knife"
                    variant="outlined"
                    v-model="person.newFood"/> 
                            
              <v-text-field 
                    :bg-color="person.newCost > 0 ? 'none' : colorRequired"
                    density="compact"
                    placeholder="Cost"
                    prepend-inner-icon="mdi-currency-usd"
                    type="number"
                    variant="outlined"
                    v-model="person.newCost">
                  </v-text-field>
          <v-btn @click="addFood(indexPerson)" icon="$plus" density="compact" variant="outlined" 
            :disabled = "person.name.trim().length < 1 || person.newCost == 0 || person.newFood.trim().length < 1"/>
        </v-sheet>
      </template>
    </v-row>
    <v-row v-if = "arrTotalCost.reduce((accumulator, currentValue) => accumulator + currentValue,0)>0">
      <v-sheet color="teal-accent-1">
            Amount Owed:
            <template v-for="(arrPaymentAmount, indexPerson) in arrCalculate">
              <v-divider/>
              <v-sheet v-if = "arrCalculate[indexPerson].reduce((accumulator, currentValue) => accumulator + currentValue,0)> 0">
                {{ arrPersons[indexPerson].name }}
                <template v-for="(paymentAmount,indexPaymentAmount) in arrPaymentAmount">
                  <div v-if="indexPaymentAmount != indexPerson && paymentAmount > 0">{{ paymentAmount.toFixed(2) }} 
                    <v-icon icon="mdi-arrow-right-thin"></v-icon> 
                    {{ arrPersons[indexPaymentAmount].name }}</div>
                </template>
              </v-sheet>            
            </template>           
      </v-sheet>            
      <v-btn density="compact" icon="mdi-content-copy" @Click = "linkCopy"></v-btn>
      <v-btn density="compact" icon="mdi-share-variant-outline" @Click = "linkShare"></v-btn>            
    </v-row>        
  </v-container>
</template>
