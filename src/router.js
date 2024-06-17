import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from './views/Home.vue'
import DetailsView from './views/Details.vue'

const routes = [  
  { path: '/', component: HomeView },
  { path: '/details', component: DetailsView },  
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router