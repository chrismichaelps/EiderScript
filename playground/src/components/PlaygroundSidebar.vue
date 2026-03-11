<script setup lang="ts">
import { ref } from 'vue';
import { examples } from '../examples';
import { usePlaygroundStore } from '../store/playground';

const store = usePlaygroundStore();
const isExpanded = ref(true);

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <aside class="w-60 bg-[#0d0d0d] border-r border-white/5 flex flex-col hidden lg:flex select-none z-10">
    <div class="p-3 flex items-center justify-between mt-2">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Explorer</span>
    </div>
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="group">
        <div 
          class="flex items-center gap-2 px-4 py-1 text-[11px] font-bold text-gray-400 hover:bg-white/5 cursor-pointer transition-colors"
          @click="toggleExpand"
        >
          <svg 
            class="w-3 h-3 transition-transform duration-200" 
            :class="{ '-rotate-90': !isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
          EXAMPLES
        </div>
        <div v-show="isExpanded" class="space-y-[1px]">
          <div 
            v-for="ex in examples" 
            :key="ex.id"
            @click="store.loadSelectedExample(ex.id)"
            :class="[
              'flex items-center gap-2.5 px-8 py-1.5 text-[13px] cursor-pointer transition-colors',
              store.selectedExampleId === ex.id 
                ? 'text-white bg-white/5 border-l-2 border-white' 
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent'
            ]"
          >
            <!-- Icon -->
            <svg v-if="store.selectedExampleId === ex.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
            <svg v-else class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
            {{ ex.name }}
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
