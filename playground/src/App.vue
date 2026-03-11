<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { usePlaygroundStore } from './store/playground';
import PlaygroundSidebar from './components/PlaygroundSidebar.vue';
import PlaygroundEditor from './components/PlaygroundEditor.vue';
import PlaygroundPreview from './components/PlaygroundPreview.vue';
import { useWindowSize, useDark } from '@vueuse/core';

const store = usePlaygroundStore();

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);

useDark({ selector: 'body', attribute: 'class', valueDark: 'dark' });

const editorWidth = ref(50);
let isResizing = false;

function startResize(e: MouseEvent) {
  if (isMobile.value) return;
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', doDrag);
  window.addEventListener('mouseup', stopDrag);
}

function doDrag(e: MouseEvent) {
  if (!isResizing || isMobile.value) return;
  const containerWidth = window.innerWidth - 256; // Sidebar width
  const leftOffset = e.clientX - 256;
  const percentage = (leftOffset / containerWidth) * 100;
  
  if (percentage > 10 && percentage < 90) {
    editorWidth.value = percentage;
  }
}

function stopDrag() {
  isResizing = false;
  document.body.style.cursor = 'default';
  document.body.style.userSelect = 'auto';
  window.removeEventListener('mousemove', doDrag);
  window.removeEventListener('mouseup', stopDrag);
}

onMounted(() => {
  store.loadSelectedExample(store.selectedExampleId);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', doDrag);
  window.removeEventListener('mouseup', stopDrag);
});
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-[#121212] text-gray-300 antialiased relative z-0">
    <header class="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#0d0d0d] z-20 shrink-0">
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">
          <img src="/eider-logo-v2.png" alt="EiderScript" class="w-6 h-6 rounded" />
          <span class="text-xs font-bold tracking-tight text-white hidden sm:block">EiderScript Playground</span>
        </div>
      </div>
    </header>
    
    <main class="flex-1 flex overflow-hidden w-full h-full text-gray-300 font-sans" :class="{ 'flex-col': isMobile }">
      
      <!-- Sidebar -->
      <PlaygroundSidebar v-show="!isMobile" />
      
      <!-- EditorArea -->
      <section 
        class="flex flex-col bg-[#121212] flex-shrink-0 relative z-10" 
        data-purpose="yaml-editor-section" 
        :style="isMobile ? { height: '50%' } : { width: editorWidth + '%' }"
      >
        <PlaygroundEditor />
      </section>
      
      <div 
        class="bg-white/10 hover:bg-white/30 transition-colors z-50 flex-none"
        :class="isMobile ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'"
        id="resize-handle"
        @mousedown="startResize"
      ></div>
      
      <!-- PreviewArea -->
      <section 
        class="flex-col bg-[#ffffff] border-white/10 flex-shrink-0 relative z-0 flex" 
        :class="isMobile ? 'border-t h-1/2' : 'border-l'"
        data-purpose="live-preview-section" 
        :style="isMobile ? { height: '50%' } : { width: (100 - editorWidth) + '%' }"
      >
        <PlaygroundPreview />
      </section>
      
    </main>
    
    <footer class="h-10 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-gray-500 font-medium shrink-0" data-purpose="status-bar">
      <div class="flex h-full">
        <div class="px-2 sm:px-4 flex items-center gap-2 hover:bg-white/5 cursor-pointer border-r border-white/5">
          <span class="w-2 h-2 rounded-full animate-pulse" :class="store.compilationError ? 'bg-red-500' : 'bg-emerald-500'"></span>
          <span class="text-white">{{ store.compilationError ? 'Error' : 'Ready' }}</span>
        </div>
        <div class="px-2 sm:px-4 flex items-center gap-2 hover:bg-white/5 cursor-pointer border-r border-white/5 hidden sm:flex" :class="store.compilationError ? 'text-red-400' : 'text-gray-400'">
          <svg v-if="store.compilationError" class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <svg v-else class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"></path></svg>
          {{ store.compilationError ? '1 Problem' : '0 Problems' }}
        </div>
      </div>
      <div class="flex h-full">
        <div class="px-2 sm:px-4 flex items-center gap-1.5 hover:bg-white/5 cursor-pointer border-l border-white/5 hidden md:flex">
          Spaces: {{ store.editorSpaces }}
        </div>
        <div class="px-2 sm:px-4 flex items-center gap-1.5 hover:bg-white/5 cursor-pointer border-l border-white/5 hidden md:flex">
          {{ store.editorEncoding }}
        </div>
        <div class="px-4 flex items-center gap-1.5 hover:bg-white/5 cursor-pointer border-l border-white/5 text-white">
          YAML {{ store.yamlVersion }}
        </div>
        <div class="px-4 flex items-center gap-1.5 bg-white/10 text-white border-l border-white/5 hidden sm:flex">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"></path></svg>
          v{{ store.projectVersion }}
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  color-scheme: dark;
}
body {
  margin: 0;
  overflow: hidden;
  background-color: #121212; /* bg-editor-bg */
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1e1e2e;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #3f3f5f;
  border-radius: 4px;
}

/* Grid background */
.bg-grid-pattern {
  background-color: #f3f4f6;
  background-image: radial-gradient(#d1d5db 1px, transparent 1px);
  background-size: 20px 20px;
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
