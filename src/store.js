import { defineStore } from "pinia";
import { ref } from 'vue'

export const useStore = defineStore("store", ()=>{    
    const iCountPersons = ref(3);
    const data = ref();
    const fullpath = ref();

    function setFullPath(path){
      this.fullpath = path;
    }
    
    function setData(data){
      this.data = data;
    }

    function incrementPersons(value = 1) {
      this.iCountPersons += value;
      console.log(this.iCountPersons);
    }
    function decrementPersons(value = 1) {
      this.iCountPersons -= value;
      console.log(this.iCountPersons);
    }
    return {iCountPersons,decrementPersons,incrementPersons, setData, setFullPath}
  }  
);