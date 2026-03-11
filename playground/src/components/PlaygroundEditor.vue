<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePlaygroundStore } from '../store/playground';
import Prism from 'prismjs';

import 'prismjs/components/prism-yaml';
import '../prism.css';

const store = usePlaygroundStore();
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const gutterRef = ref<HTMLDivElement | null>(null);

const code = computed({
  get: () => store.yamlCode,
  set: (val) => store.updateCode(val)
});

const highlightedCode = ref('');

const updateHighlighting = () => {
  highlightedCode.value = Prism.highlight(
    code.value || '',
    Prism.languages.yaml,
    'yaml'
  ) + '\n'; // Extra newline to sync scroll
};

watch(code, () => {
  updateHighlighting();
}, { immediate: true });

// Live gutters
const lineCount = computed(() => {
  if (!code.value) return 1;
  return code.value.split('\n').length;
});

// Tab handling
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    // Insert 2 spaces
    const val = target.value;
    code.value = val.substring(0, start) + '  ' + val.substring(end);
    
    // Reposition caret
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    }, 0);
  }
};

// Sync scrolls
const handleScroll = (e: Event) => {
  if (textareaRef.value) {
    const { scrollTop } = textareaRef.value;
    if (gutterRef.value) gutterRef.value.scrollTop = scrollTop;
    
    // Sync highlight overlay
    const overlay = textareaRef.value.parentElement?.querySelector('.highlight-overlay');
    if (overlay) overlay.scrollTop = scrollTop;
  }
};
</script>

<template>
  <section class="flex-1 flex flex-col bg-[#121212] flex-shrink-0 transition-width h-full w-full relative z-10" data-purpose="yaml-editor-section">
    <div class="h-9 border-b border-white/5 flex items-center bg-[#0d0d0d] shrink-0">
      <div class="h-full px-4 flex items-center gap-2 bg-[#121212] border-r border-white/5 text-[11px] text-gray-300">
        <svg class="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"></path></svg>
        {{ store.selectedExampleId }}.eider.yaml
        <span class="ml-2 text-gray-600 hover:text-white cursor-pointer">×</span>
      </div>
      <div class="flex-1 shrink-0">
        <div v-if="store.isLoading" class="flex gap-1.5 items-center px-4 py-1 h-full float-left">
          <svg class="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="flex-1 flex overflow-hidden relative">
      <div 
        ref="gutterRef"
        class="w-12 bg-[#0d0d0d]/30 border-r border-white/5 flex flex-col items-center pt-4 text-[11px] text-gray-600 select-none font-mono leading-normal overflow-hidden h-full"
      >
        <span v-for="n in Math.max(lineCount, 30)" :key="n">{{ n }}</span>
      </div>
      
      <div class="flex-1 relative overflow-hidden h-full font-mono text-[13px] leading-normal bg-transparent">
        <pre 
          class="highlight-overlay absolute inset-0 p-4 m-0 pointer-events-none overflow-hidden whitespace-pre pointer-events-none select-none language-yaml"
          aria-hidden="true"
        ><code v-html="highlightedCode" class="language-yaml"></code></pre>
        <textarea
          ref="textareaRef"
          v-model="code"
          @keydown="handleKeydown"
          @scroll="handleScroll"
          spellcheck="false"
          class="absolute inset-0 w-full h-full p-4 bg-transparent outline-none resize-none text-transparent caret-white overflow-auto whitespace-pre z-10 custom-scrollbar"
        ></textarea>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.hide-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.hide-scrollbar::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 6px;
  border: 3px solid #1e1e1e;
}
.hide-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

.highlight-overlay {
  -webkit-text-fill-color: initial;
}
</style>
