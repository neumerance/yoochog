<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import MicIcon from '@/components/icons/MicIcon.vue'
import PlaylistIcon from '@/components/icons/PlaylistIcon.vue'
import SmartphoneIcon from '@/components/icons/SmartphoneIcon.vue'
import TvScreenIcon from '@/components/icons/TvScreenIcon.vue'
import logoUrl from '@/assets/images/logo/yoochoog.png'

const mobileMenuOpen = ref(false)

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

watch(mobileMenuOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

function onDocumentEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMobileMenu()
  }
}

let removeMqListener: (() => void) | undefined

onMounted(() => {
  document.addEventListener('keydown', onDocumentEscape)
  const mq = window.matchMedia('(min-width: 640px)')
  const onViewport = () => {
    if (mq.matches) {
      closeMobileMenu()
    }
  }
  mq.addEventListener('change', onViewport)
  removeMqListener = () => mq.removeEventListener('change', onViewport)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentEscape)
  removeMqListener?.()
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white text-black">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[130] focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>

    <header
      class="relative z-0 [padding-top:max(0.75rem,env(safe-area-inset-top,0px))]"
      role="banner"
    >
      <div class="relative border-b border-black/10 bg-white/95 backdrop-blur-md">
        <div
          class="mx-auto flex w-full max-w-5xl flex-col px-4 pb-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
        >
          <div
            class="relative flex w-full items-start sm:w-auto sm:items-center sm:gap-2"
          >
            <!-- Mobile: same width as menu column so logo block is viewport-centered -->
            <div class="w-11 shrink-0 sm:hidden" aria-hidden="true" />

            <div
              class="flex min-w-0 flex-1 flex-col items-center gap-1 text-center sm:flex-none sm:flex-row sm:items-center sm:gap-2 sm:text-left"
            >
              <img
                :src="logoUrl"
                alt="Yoochog"
                class="mx-auto h-auto w-full max-w-[min(80vw,calc(100vw-7.5rem))] object-contain object-center sm:mx-0 sm:h-11 sm:w-auto sm:max-w-none"
                width="120"
                height="40"
                decoding="async"
              />
              <span
                class="max-w-[min(80vw,calc(100vw-7.5rem))] text-[0.8rem] font-medium uppercase leading-snug tracking-[0.12em] text-neutral-500 sm:max-w-none sm:text-[0.8rem] sm:font-semibold sm:normal-case sm:leading-normal sm:tracking-wide sm:text-neutral-700"
              >
                Group Karaoke
              </span>
            </div>

            <div class="flex w-11 shrink-0 justify-center sm:hidden">
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-xl text-black hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                :aria-expanded="mobileMenuOpen"
                aria-controls="site-mobile-nav"
                :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
                @click="toggleMobileMenu"
              >
                <svg
                  v-if="!mobileMenuOpen"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <nav
            aria-label="Primary"
            class="hidden sm:flex sm:flex-row sm:items-center sm:gap-3"
          >
            <a
              class="rounded-lg px-4 py-2.5 text-base font-medium text-neutral-800 underline-offset-4 hover:bg-black/5 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
              href="#for-guests"
            >
              Guest? How joining works
            </a>
            <RouterLink
              class="inline-flex min-h-12 min-w-[13rem] shrink-0 flex-nowrap items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#FF3B30] px-6 py-3 text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,59,48,0.35)] transition hover:bg-[#D70015] hover:shadow-[0_4px_14px_rgba(215,0,21,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
              to="/host"
            >
              <MicIcon icon-class="h-5 w-5 shrink-0" />
              <span>Let's start singing</span>
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <!-- Mobile menu stack (teleported to body): drawer z-[120] > overlay z-[110] > page (z-0) -->
    <Teleport to="body">
      <Transition name="home-drawer-backdrop">
        <div
          v-if="mobileMenuOpen"
          class="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[2px] sm:hidden"
          aria-hidden="true"
          @click="closeMobileMenu"
        />
      </Transition>
    </Teleport>
    <Teleport to="body">
      <Transition name="home-drawer-panel">
        <aside
          v-if="mobileMenuOpen"
          id="site-mobile-nav"
          class="fixed inset-y-0 right-0 z-[120] flex w-[60%] flex-col bg-white shadow-[-16px_0_40px_-8px_rgba(0,0,0,0.18)] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          :style="{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }"
        >
          <nav class="flex flex-1 flex-col justify-start gap-4 pt-6" aria-label="Mobile primary">
            <RouterLink
              class="flex min-h-[4.25rem] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-[#FF3B30] px-3 py-3.5 text-white shadow-[0_2px_10px_rgba(255,59,48,0.35)] transition hover:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
              to="/host"
              aria-label="Let's start singing — open host screen"
              @click="closeMobileMenu"
            >
              <MicIcon icon-class="h-6 w-6 shrink-0 opacity-95" />
              <span class="text-center text-[0.8125rem] font-semibold leading-tight tracking-tight text-white">
                Let's start singing
              </span>
            </RouterLink>
            <a
              class="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl px-3 py-3 text-center text-sm font-medium leading-snug text-neutral-800 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
              href="#for-guests"
              @click="closeMobileMenu"
            >
              How joining works
            </a>
          </nav>
        </aside>
      </Transition>
    </Teleport>

    <main id="main" class="relative z-0 flex flex-1 flex-col">
      <section
        class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 [padding-bottom:max(3rem,env(safe-area-inset-bottom,0px))]"
        aria-labelledby="hero-heading"
      >
        <div class="mx-auto max-w-2xl text-center">
          <h1
            id="hero-heading"
            class="text-balance text-3xl font-bold tracking-tight text-black sm:text-4xl md:text-5xl"
          >
            Karaoke for your crew—one screen, every voice
          </h1>
          <p class="mt-5 text-pretty text-lg leading-relaxed text-neutral-600 sm:text-xl">
            Run the night from a <strong class="font-semibold text-black">TV, laptop, or desktop</strong>.
            Guests join on their phones, pick their karaoke tracks, and take turns at the mic while
            everyone stays in sync—no accounts, no installing another app.
          </p>
          <div class="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:items-center sm:gap-4">
            <RouterLink
              class="inline-flex min-h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-[#FF3B30] px-7 py-3.5 text-[0.9375rem] font-semibold text-white shadow-[0_2px_10px_rgba(255,59,48,0.35)] transition hover:bg-[#D70015] hover:shadow-[0_4px_16px_rgba(215,0,21,0.38)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30] sm:text-base"
              to="/host"
            >
              <MicIcon icon-class="h-[1.125rem] w-[1.125rem] shrink-0 sm:h-5 sm:w-5" />
              <span>Let's start singing</span>
            </RouterLink>
            <a
              class="inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-[0.9375rem] font-semibold text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30] sm:text-base"
              href="#how-it-works"
            >
              See how it works
            </a>
          </div>
          <p class="mt-6 text-sm leading-relaxed text-neutral-500">
            Tracks come from YouTube—lyrics videos, official instrumentals, or the karaoke versions your
            group already loves.
          </p>
        </div>
      </section>

      <section
        id="how-it-works"
        class="relative overflow-hidden border-t border-black/10 bg-gradient-to-b from-red-100/90 via-white to-red-50/80 py-16 sm:py-20"
        aria-labelledby="how-heading"
      >
        <div
          class="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#FF3B30]/[0.15] blur-3xl"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-black/[0.04] blur-3xl"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[min(100%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF3B30]/5 blur-2xl"
          aria-hidden="true"
        />

        <div class="relative mx-auto max-w-5xl px-4 sm:px-6">
          <p
            class="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#FF3B30] sm:text-sm"
          >
            Three easy beats
          </p>
          <h2
            id="how-heading"
            class="mx-auto mt-3 max-w-2xl text-balance text-center text-3xl font-bold tracking-tight text-black sm:text-4xl"
          >
            From living room to last chorus—here's the flow
          </h2>
          <p
            class="mx-auto mt-4 max-w-2xl text-pretty text-center text-base leading-relaxed text-neutral-700 sm:text-lg"
          >
            No manuals, no sign-ups—just a big screen for the room and phones for the crew.
          </p>

          <ol
            class="mt-12 grid gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-5 lg:gap-6"
          >
            <li
              class="group relative flex flex-col rounded-3xl border-2 border-black/[0.08] bg-white p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)] transition duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-[#FF3B30]/45 motion-safe:hover:shadow-[0_22px_50px_-18px_rgba(255,59,48,0.35)] sm:p-7"
            >
              <span
                class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white tabular-nums shadow-md"
                aria-hidden="true"
              >
                1
              </span>
              <div
                class="mb-5 inline-flex w-fit rounded-2xl bg-gradient-to-br from-[#FF3B30]/15 to-red-50 p-3.5 text-[#FF3B30] ring-2 ring-[#FF3B30]/15"
              >
                <TvScreenIcon icon-class="h-8 w-8" />
              </div>
              <h3 class="text-xl font-bold leading-snug text-black sm:text-[1.35rem]">
                Light up the big screen
              </h3>
              <p class="mt-3 flex-1 text-base leading-relaxed text-neutral-600">
                Open Yoochog on your <strong class="font-semibold text-black">TV, laptop, or desktop</strong>.
                You'll see who's singing, what's up next, and a QR code your friends can scan in seconds.
              </p>
            </li>

            <li
              class="group relative flex flex-col rounded-3xl border-2 border-black/[0.08] bg-white p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)] transition duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-[#FF3B30]/45 motion-safe:hover:shadow-[0_22px_50px_-18px_rgba(255,59,48,0.35)] sm:p-7"
            >
              <span
                class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white tabular-nums shadow-md"
                aria-hidden="true"
              >
                2
              </span>
              <div
                class="mb-5 inline-flex w-fit rounded-2xl bg-gradient-to-br from-[#FF3B30]/15 to-red-50 p-3.5 text-[#FF3B30] ring-2 ring-[#FF3B30]/15"
              >
                <SmartphoneIcon icon-class="h-8 w-8" />
              </div>
              <h3 class="text-xl font-bold leading-snug text-black sm:text-[1.35rem]">
                Friends jump in from their phones
              </h3>
              <p class="mt-3 flex-1 text-base leading-relaxed text-neutral-600">
                They tap the <strong class="font-semibold text-black">join link</strong> you share—same vibe as
                passing the aux, but everyone picks their own karaoke pick from the couch.
              </p>
            </li>

            <li
              class="group relative flex flex-col rounded-3xl border-2 border-black/[0.08] bg-white p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.18)] transition duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-[#FF3B30]/45 motion-safe:hover:shadow-[0_22px_50px_-18px_rgba(255,59,48,0.35)] sm:p-7"
            >
              <span
                class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white tabular-nums shadow-md"
                aria-hidden="true"
              >
                3
              </span>
              <div
                class="mb-5 inline-flex w-fit rounded-2xl bg-gradient-to-br from-[#FF3B30]/15 to-red-50 p-3.5 text-[#FF3B30] ring-2 ring-[#FF3B30]/15"
              >
                <div class="flex items-center gap-1">
                  <PlaylistIcon icon-class="h-7 w-7" />
                  <MicIcon icon-class="h-6 w-6 opacity-90" />
                </div>
              </div>
              <h3 class="text-xl font-bold leading-snug text-black sm:text-[1.35rem]">
                Queue it up and pass the mic
              </h3>
              <p class="mt-3 flex-1 text-base leading-relaxed text-neutral-600">
                Paste a YouTube link, tap <strong class="font-semibold text-black">Enqueue</strong>, and the room
                hears it when it's your turn—fair rotation, everyone in sync, every chorus together.
              </p>
            </li>
          </ol>

          <div
            id="for-guests"
            class="relative mt-14 overflow-hidden rounded-3xl border-2 border-[#FF3B30] bg-gradient-to-br from-white via-white to-red-50 p-6 shadow-[0_16px_50px_-20px_rgba(255,59,48,0.45)] sm:mt-16 sm:p-9"
          >
            <div
              class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FF3B30]/10"
              aria-hidden="true"
            />
            <div
              class="pointer-events-none absolute -bottom-6 left-8 h-24 w-24 rounded-full bg-black/[0.04]"
              aria-hidden="true"
            />

            <div class="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black text-white shadow-lg ring-4 ring-[#FF3B30]/20"
              >
                <MicIcon icon-class="h-8 w-8 text-white" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold uppercase tracking-wide text-[#FF3B30]">Guests — this one's for you</p>
                <h3 class="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                  Joining takes seconds
                </h3>
                <p class="mt-4 max-w-3xl text-base leading-relaxed text-neutral-700 sm:text-[1.05rem]">
                  Your host shares a link like
                  <span
                    class="break-words rounded-md bg-black/[0.06] px-1.5 py-0.5 font-mono text-sm font-medium text-black sm:whitespace-nowrap"
                    >/join/your-room-code</span
                  >. Open it on your phone, add your name if asked, then find or paste the YouTube karaoke
                  track you want. The big screen shows who's on the mic and who's next—the whole crew stays in
                  the same moment.
                </p>
              </div>
            </div>

            <div
              class="relative mt-6 rounded-2xl border border-white/10 bg-black px-5 py-4 text-white sm:mt-8 sm:px-6 sm:py-5"
            >
              <p class="text-sm leading-relaxed text-white/90 sm:text-base">
                <span class="font-bold text-[#FF3B30]">Hot tip:</span>
                One song in the queue per guest at a time keeps the line moving—so more people get a turn at
                the mic before the night ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        class="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-16"
        aria-labelledby="cta-heading"
      >
        <div class="rounded-2xl bg-black px-6 py-10 text-center text-white shadow-lg sm:px-10 sm:py-12">
          <h2 id="cta-heading" class="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready when you are
          </h2>
          <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Open the host view, share the join link or QR, and make your next night together a karaoke
            night—no extra karaoke boxes or remotes to pass around.
          </p>
          <RouterLink
            class="mt-8 inline-flex min-h-12 min-w-[12rem] flex-nowrap items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#FF3B30] px-8 py-3.5 text-base font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition hover:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            to="/host"
          >
            <MicIcon icon-class="h-5 w-5 shrink-0" />
            <span>Let's start singing</span>
          </RouterLink>
        </div>
      </section>
    </main>

    <footer
      class="mt-auto border-t border-black/10 bg-white py-8 [padding-bottom:max(2rem,env(safe-area-inset-bottom,0px))]"
      role="contentinfo"
    >
      <div class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-neutral-600 sm:flex-row sm:px-6 sm:text-left">
        <p class="max-w-prose">
          <strong class="font-medium text-black">Yoochog</strong> — built for karaoke with friends, right in your browser.
        </p>
        <RouterLink
          class="inline-flex shrink-0 flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap font-medium text-[#FF3B30] underline-offset-2 hover:text-[#D70015] hover:underline"
          to="/host"
        >
          <MicIcon icon-class="h-4 w-4 shrink-0 text-current" />
          <span>Let's start singing →</span>
        </RouterLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Mobile drawer: backdrop fade */
.home-drawer-backdrop-enter-active,
.home-drawer-backdrop-leave-active {
  transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}
.home-drawer-backdrop-enter-from,
.home-drawer-backdrop-leave-to {
  opacity: 0;
}

/* Mobile drawer: slide in from right (60% width panel) */
.home-drawer-panel-enter-active,
.home-drawer-panel-leave-active {
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}
.home-drawer-panel-enter-from,
.home-drawer-panel-leave-to {
  transform: translateX(100%);
}
</style>
