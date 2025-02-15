<script lang="ts" setup>
import 'xterm/css/xterm.css'
import fuzzaldrin from 'fuzzaldrin-plus'
import { quote } from 'shell-quote'
import { onActivated, watchEffect } from 'vue'
import type { CommandCompletion, TerminalTab } from '../../typings/terminal'
import type { TerminalTabDirection } from '../compositions/terminal'
import { appendTerminalTab, getTerminalTabIndex, isMatchLinkModifier, useMovingTerminalIndex, writeTerminalTab } from '../compositions/terminal'
import { openContextMenu } from '../utils/frame'
import { escapeHTML, handleMousePressing } from '../utils/helper'

const { tab } = defineProps<{
  tab: TerminalTab,
}>()

const movingIndex = $(useMovingTerminalIndex())
const currentIndex = $computed(() => getTerminalTabIndex(tab))

const element = $ref<HTMLElement | undefined>()

function dragFileOver(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'link'
  }
}

function dropFile(event: DragEvent) {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer) return
  const files = dataTransfer.files
  if (files.length) {
    const paths = Array.from(files).map(({ path }) => path)
    writeTerminalTab(tab, quote(paths))
  } else {
    const data = dataTransfer.getData('text')
    writeTerminalTab(tab, data)
  }
}

function openEditingMenu(event: MouseEvent) {
  openContextMenu([
    {
      label: 'Copy#!menu.copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy',
    },
    {
      label: 'Paste#!menu.paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste',
    },
    {
      type: 'separator',
    },
    {
      label: 'Clear#!menu.clear',
      accelerator: 'CmdOrCtrl+K',
      command: 'clear-terminal',
    },
  ], event)
}

function fit() {
  if (tab.xterm.element?.clientWidth) {
    tab.addons.fit.fit()
  }
}

const observer = new ResizeObserver(fit)

watchEffect((onInvalidate) => {
  const el = element
  if (!el) return
  const xterm = tab.xterm
  // FIXME: don't know why
  if (xterm.element && document.contains(xterm.element)) return
  xterm.open(el)
  // Add cell size properties
  const cell = xterm['_core']._renderService.dimensions.css.cell
  el.style.setProperty('--cell-width', `${cell.width}px`)
  el.style.setProperty('--cell-height', `${cell.height}px`)
  tab.deferred.open.resolve()
  xterm.focus()
  observer.observe(el)
  onInvalidate(() => {
    observer.unobserve(el)
  })
})

onActivated(() => {
  const xterm = tab.xterm
  if (xterm['_core'].viewport) {
    xterm['_core'].viewport.syncScrollArea(true)
  }
})

function highlightLabel(label: string, query: string) {
  return query ? fuzzaldrin.wrap(escapeHTML(label), escapeHTML(query)) : label
}

function getCompletionIcon(item: CommandCompletion) {
  if (item.value === item.query) return 'ph-bold ph-arrow-bend-down-left'
  switch (item.type) {
    case 'history':
      return 'ph-bold ph-clock-counter-clockwise'
    case 'file':
      return 'ph-bold ph-file'
    case 'directory':
      return 'ph-bold ph-folder-open'
    case 'recommendation':
      return 'ph-bold ph-fast-forward'
    case 'command':
      return 'ph-bold ph-terminal'
    default:
      return 'ph-bold ph-dots-three'
  }
}

function selectCompletion(event: MouseEvent) {
  const item = tab.addons.shellIntegration!.getCompletionElement(event.target)
  if (item) {
    event.stopPropagation()
    event.preventDefault()
    if (isMatchLinkModifier(event)) {
      tab.addons.shellIntegration!.selectCompletionElement(item)
    } else {
      tab.addons.shellIntegration!.applyCompletionElement(item)
    }
    tab.xterm.focus()
  }
}

const root = $ref<HTMLElement | undefined>()
const movingTarget = $ref<HTMLElement | undefined>()

function getMovingDirection(target: HTMLElement, event: MouseEvent): TerminalTabDirection {
  const bounds = target.getBoundingClientRect()
  if (event.clientX > bounds.left + bounds.width * 3 / 4) return 'right'
  if (event.clientX < bounds.left + bounds.width / 4) return 'left'
  if (event.clientY > bounds.top + bounds.height * 3 / 4) return 'bottom'
  if (event.clientY < bounds.top + bounds.height / 4) return 'top'
  return 'right'
}

let movingDirection = $ref<TerminalTabDirection | undefined>()

watchEffect(onInvalidate => {
  if (root && movingTarget) {
    movingDirection = undefined
    const cancel = handleMousePressing({
      element: root,
      onMove(event) {
        event.preventDefault()
        movingDirection = getMovingDirection(root, event)
      },
      onEnd(event) {
        event.preventDefault()
        appendTerminalTab(tab, movingIndex, movingDirection)
      },
      onLeave() {
        movingDirection = undefined
      },
      active: true,
    })
    onInvalidate(() => {
      cancel()
    })
  }
})
</script>

<template>
  <div
    ref="root"
    class="terminal-teletype"
    data-shell-integration="container"
    @contextmenu="openEditingMenu"
    @dragover.prevent="dragFileOver"
    @drop.prevent="dropFile"
    @click="selectCompletion"
  >
    <div ref="element" class="terminal-content"></div>
    <div v-if="tab.completions" data-shell-integration="completion-source">
      <div class="terminal-completion-wrapper">
        <ul class="terminal-completion-list">
          <li
            v-for="(item, index) in tab.completions"
            :key="index"
            :class="[
              'terminal-completion-item',
              item.type ?? 'default',
              { 'is-passthrough': item.value === item.query },
              { 'is-active': !index },
            ]"
            :data-value="item.value"
            :data-desc="item.description ?? ''"
            :data-back="item.query.length"
          >
            <span :class="['completion-item-icon', getCompletionIcon(item)]"></span>
            <span class="completion-item-label" v-html="highlightLabel(item.value, item.query)"></span>
          </li>
        </ul>
        <div class="terminal-completion-desc">{{ tab.completions[0]?.description ?? '' }}</div>
      </div>
    </div>
    <div
      v-if="movingIndex !== -1 && movingIndex !== currentIndex"
      ref="movingTarget"
      :class="['moving-target', movingDirection]"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/_partials';

.terminal-teletype {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.terminal-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  :deep(.xterm) {
    padding: 4px 12px;
  }
  :deep(.xterm-viewport) {
    @include partials.scroll-container;
    z-index: 1;
    background-color: transparent !important;
    /* Make decoration interactive */
    pointer-events: none;
  }
  /* issue@xterm: pointer behavior */
  :deep(.xterm-screen) {
    z-index: 0;
  }
}
[data-shell-integration='completion-source'] {
  display: none;
}
@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
:deep(.terminal-marker-highlight-line) {
  background: rgb(var(--theme-magenta) / 0.5);
  animation: fade-out 1s;
}
:deep(.terminal-command-mark) {
  margin-left: calc(0px - var(--cell-width));
  &::before {
    content: '';
    display: block;
    width: 6px !important;
    height: 6px !important;
    margin-top: calc(var(--cell-height) / 2 - 3px);
    background: rgb(var(--color) / var(--opacity));
    border-radius: 50%;
  }
}
:deep(.terminal-highlight-block) {
  margin-left: calc(0px - var(--cell-width));
  border-left: calc(var(--cell-width) / 2) solid rgb(var(--color));
  background: rgb(var(--color) / 0.2);
}
:deep(.terminal-completion) {
  max-height: calc(var(--cell-height) * var(--row-span));
  margin-left: calc(var(--column) * var(--cell-width));
  border: 1px solid rgb(127 127 127 / 0.5);
  overflow: hidden;
  background: rgb(var(--theme-background) / var(--theme-opacity));
  border-radius: 4px;
  box-shadow: 0 0 1em 0px rgb(0 0 0 / 25%);
  backdrop-filter: var(--vibrancy-filter);
  // TODO: This may slightly slow down, but is friendlier visually
  transition: transform 50ms, margin-left 50ms;
  &.is-right {
    transform: translateX(-100%);
  }
  &.is-top {
    transform: translateY(-100%);
    &.is-right {
      transform: translateX(-100%) translateY(-100%);
    }
  }
  &.is-bottom {
    margin-top: var(--cell-height);
  }
}
.terminal-completion-wrapper {
  @include partials.scroll-container(8px);
  display: flex;
  height: 100%;
}
.terminal-completion-list {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
}
.terminal-completion-item {
  display: flex;
  align-items: center;
  padding: 0 0.25ch;
  cursor: pointer;
  &:hover, &.is-active {
    background: var(--design-card-background);
  }
  :deep(strong) {
    color: rgb(var(--theme-blue));
  }
}
.completion-item-icon {
  flex: none;
  margin-right: 0.25ch;
  font-size: 12px;
  opacity: 0.75;
  .terminal-completion-item.history & {
    color: rgb(var(--theme-yellow));
  }
  .terminal-completion-item.file &,
  .terminal-completion-item.directory & {
    color: rgb(var(--theme-cyan));
  }
  .terminal-completion-item.recommendation & {
    color: rgb(var(--theme-green));
  }
  .terminal-completion-item.command & {
    color: rgb(var(--theme-magenta));
  }
  .terminal-completion-item.is-passthrough & {
    color: rgb(var(--theme-red));
  }
}
.completion-item-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.terminal-completion-desc {
  position: sticky;
  top: 0;
  flex: 1;
  padding: 0 0.25ch;
  color: rgb(var(--theme-foreground) / 0.5);
  font-style: italic;
  font-size: 12px;
  white-space: pre-wrap;
  overflow: hidden;
  &:empty {
    display: none;
  }
}
.moving-target {
  position: absolute;
  inset: 50%;
  background: var(--design-card-background);
  transition: inset 0.2s;
  &.top {
    inset: 0 0 75% 0;
  }
  &.bottom {
    inset: 75% 0 0 0;
  }
  &.left {
    inset: 0 75% 0 0;
  }
  &.right {
    inset: 0 0 0 75%;
  }
}
</style>
