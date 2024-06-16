<script setup>
import { ref } from 'vue'
import { useRouter} from 'vue-router'
import { useStore } from "./../store.js";
const store = useStore();// cannot destructure from object when declaring, have to reference via store.<variable/function>
const router = useRouter() //composition api reference

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