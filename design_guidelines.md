{
  "meta": {
    "project": "Tiny Faith Songs — Bible Song Contest Landing (Next.js App Router + Tailwind)",
    "tone": ["kid-friendly", "joyful", "faith-themed", "trustworthy-for-parents"],
    "mode": "light-only",
    "i18n": {
      "default_locale": "vi",
      "supported_locales": ["vi", "en"],
      "navbar_toggle": true,
      "rule": "All visible strings must come from i18n dictionaries (no hardcoded UI copy)."
    },
    "testing": {
      "data_testid_rule": "All interactive and key informational elements MUST include data-testid (kebab-case, role-based)."
    }
  },

  "brand_personality": {
    "keywords": [
      "storybook-playful",
      "sky-and-clouds",
      "floating-music-notes",
      "rounded-soft-geometry",
      "clean-trustworthy-form"
    ],
    "visual_fusion": {
      "layout_principle": "Bento + storybook sections (wavy dividers) with strong vertical rhythm",
      "surface_style": "Soft cards (white) with pastel borders + subtle shadow; decorative blobs behind sections",
      "illustration_style": "Existing banner characters (Tony/Windy/robot) + simple vector-like clouds/notes (CSS/SVG)"
    }
  },

  "typography": {
    "google_fonts": {
      "heading": {
        "family": "Fredoka",
        "weights": [500, 600, 700],
        "fallback": "ui-sans-serif, system-ui"
      },
      "body": {
        "family": "Figtree",
        "weights": [400, 500, 600],
        "fallback": "ui-sans-serif, system-ui"
      }
    },
    "tailwind_font_tokens": {
      "fontFamily": {
        "sans": ["Figtree", "ui-sans-serif", "system-ui"],
        "display": ["Fredoka", "ui-sans-serif", "system-ui"]
      }
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight",
      "h2": "text-base md:text-lg font-sans text-muted-foreground",
      "section_title": "text-2xl sm:text-3xl font-display font-bold",
      "card_title": "text-lg font-display font-semibold",
      "body": "text-sm sm:text-base font-sans leading-relaxed",
      "small": "text-xs sm:text-sm text-muted-foreground"
    },
    "copy_rules": {
      "line_length": "Keep long paragraphs <= 70ch on desktop (use max-w-prose).",
      "bilingual": "Avoid idioms; keep sentences short for easy translation."
    }
  },

  "color_system": {
    "notes": [
      "Light mode only.",
      "Use solid colors for reading areas; gradients only as decorative section backgrounds (<=20% viewport).",
      "No dark/saturated gradients (no purple/pink combos)."
    ],
    "semantic_tokens_hsl": {
      "background": "210 40% 98%",
      "foreground": "222 47% 11%",

      "card": "0 0% 100%",
      "card-foreground": "222 47% 11%",

      "primary": "205 92% 45%",
      "primary-foreground": "0 0% 100%",

      "secondary": "48 100% 92%",
      "secondary-foreground": "222 47% 11%",

      "accent": "332 92% 92%",
      "accent-foreground": "222 47% 11%",

      "muted": "210 30% 96%",
      "muted-foreground": "215 16% 40%",

      "border": "214 25% 88%",
      "input": "214 25% 88%",
      "ring": "205 92% 45%",

      "success": "152 55% 40%",
      "warning": "38 92% 50%",
      "destructive": "0 84% 60%"
    },
    "brand_palette_hex": {
      "sky": {
        "blue_600": "#0EA5E9",
        "blue_100": "#E0F2FE"
      },
      "sun": {
        "yellow_300": "#FDE68A",
        "yellow_200": "#FEF3C7"
      },
      "bubblegum": {
        "pink_200": "#FBCFE8",
        "pink_300": "#F9A8D4"
      },
      "ink": {
        "slate_900": "#0F172A",
        "slate_700": "#334155"
      },
      "cloud": {
        "white": "#FFFFFF",
        "cloud_edge": "#DCEBFF"
      }
    },
    "allowed_gradients": {
      "hero_sky": "bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(253,230,138,0.22),transparent_50%),radial-gradient(900px_circle_at_70%_80%,rgba(251,207,232,0.22),transparent_55%)]",
      "section_wash": "bg-[radial-gradient(900px_circle_at_10%_20%,rgba(14,165,233,0.12),transparent_55%),radial-gradient(900px_circle_at_90%_70%,rgba(251,207,232,0.14),transparent_55%)]"
    },
    "texture": {
      "noise_overlay_css": ".noise::before{content:'';position:absolute;inset:0;background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.08\"/></svg>');mix-blend-mode:multiply;pointer-events:none;}"
    }
  },

  "layout_grid": {
    "container": "max-w-6xl mx-auto px-4 sm:px-6",
    "section_spacing": "py-12 sm:py-16 lg:py-20",
    "bento_grid": "grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6",
    "card_radius": "rounded-2xl",
    "radius_tokens": {
      "--radius": "1rem",
      "--radius-lg": "1.25rem"
    }
  },

  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "navigation_menu": "/app/frontend/src/components/ui/navigation-menu.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "label": "/app/frontend/src/components/ui/label.jsx",
      "checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "carousel": "/app/frontend/src/components/ui/carousel.jsx"
    },

    "buttons": {
      "shape": "Rounded (10–14px), slightly tall",
      "variants": {
        "primary": {
          "use": "Main CTA (Register Now / Đăng ký ngay)",
          "classes": "rounded-xl bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.98] transition-colors",
          "data_testid_examples": ["hero-register-button", "navbar-register-button", "form-submit-button"]
        },
        "secondary": {
          "use": "Secondary actions (View playlist, Learn more)",
          "classes": "rounded-xl bg-amber-100 text-slate-900 hover:bg-amber-200 border border-amber-200 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors active:scale-[0.98]",
          "data_testid_examples": ["playlist-link-button"]
        },
        "ghost": {
          "use": "Navbar language toggle / anchor links",
          "classes": "rounded-xl hover:bg-slate-100 text-slate-700 transition-colors",
          "data_testid_examples": ["navbar-language-toggle", "navbar-about-link"]
        }
      },
      "icon_rule": "Use lucide-react icons only (no emoji icons)."
    },

    "cards": {
      "base": "rounded-2xl bg-white border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
      "playful_border": "border-sky-200/70",
      "header": "space-y-1",
      "content": "space-y-3",
      "micro_interaction": "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)] transition-[box-shadow]"
    },

    "badges": {
      "deadline": "bg-amber-100 text-slate-900 border border-amber-200 rounded-full px-3 py-1",
      "status": {
        "open": "bg-emerald-50 text-emerald-800 border border-emerald-200",
        "closed": "bg-slate-100 text-slate-700 border border-slate-200"
      }
    },

    "forms": {
      "field_layout": "grid grid-cols-1 sm:grid-cols-2 gap-4",
      "input": "h-11 rounded-xl bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-sky-500",
      "helper_text": "text-xs text-slate-600",
      "error_text": "text-xs text-red-600",
      "consent": {
        "pattern": "Checkbox + short consent copy + link to privacy note",
        "data_testid": "registration-consent-checkbox"
      }
    },

    "upload": {
      "mode_toggle": "Tabs: Upload Video vs Paste Link (shadcn Tabs)",
      "per_song_block": "Card per song (1..6) with title, requirement hint, mode tabs, input/file picker, progress, status badge",
      "progress": {
        "component": "shadcn Progress",
        "classes": "h-2 rounded-full bg-sky-100",
        "fill_color": "Use CSS variable or class to set indicator to sky-600; avoid gradients on small elements (<100px).",
        "a11y": "role=progressbar + aria-valuenow + aria-valuemin/max; announce status text in a live region",
        "data_testid_examples": ["song-1-upload-progress", "song-1-upload-status-text"]
      },
      "states": {
        "idle": "Show dashed dropzone button (Button variant secondary) + helper text",
        "uploading": "Disable inputs; show progress + 'Uploading…'",
        "success": "Show check icon + 'Uploaded' badge",
        "error": "Show destructive Alert + Retry button"
      }
    },

    "modal_success": {
      "component": "shadcn Dialog",
      "content": "Big friendly headline + summary + next steps (YouTube playlist link) + close button",
      "data_testid": ["registration-success-dialog", "registration-success-close-button"]
    },

    "toast": {
      "library": "sonner",
      "use_cases": ["upload error", "form validation", "submission success"],
      "data_testid": ["toast-region"]
    }
  },

  "section_blueprints": {
    "navbar": {
      "layout": "Sticky top, translucent white with blur; left logo, center anchors (desktop), right language toggle + Register button",
      "mobile": "Use shadcn Sheet for menu; keep language toggle visible",
      "classes": "sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200",
      "data_testid": {
        "language_toggle": "navbar-language-toggle",
        "register": "navbar-register-button",
        "mobile_menu": "navbar-mobile-menu-button"
      }
    },

    "hero": {
      "goal": "Immediate trust + joy + CTA",
      "layout": "Two-column on desktop: left copy + CTA, right hero banner image. On mobile: banner first, then copy.",
      "background": "Use allowed hero_sky gradient + noise overlay; add floating notes/clouds as absolute decorative elements",
      "banner_swap": "When locale changes, swap /public/banner-horizontal-vi.jpg vs banner-horizontal-en.jpg",
      "cta": "Primary button scrolls to #register",
      "data_testid": {
        "hero_cta": "hero-register-button",
        "hero_banner": "hero-banner-image"
      }
    },

    "about_mission": {
      "layout": "Bento: left mission copy, right 'Why join' bullets with icons",
      "decor": "Cloud divider at top/bottom (SVG)"
    },

    "eligibility_timeline": {
      "layout": "Two cards: Eligibility + Timeline",
      "timeline_component": "Use simple vertical timeline list with date badges; optional shadcn Accordion for mobile",
      "data_testid": ["timeline-section", "eligibility-section"]
    },

    "prizes": {
      "layout": "3 prize cards in a row (stack on mobile). Robot mascot floats near the cards (absolute on lg)",
      "robot": "Use /public/robot-mascot.jpg when available; until then use placeholder silhouette (simple SVG) with alt text",
      "card_style": "Each prize card has a top icon circle (solid color), amount big, and small caption",
      "data_testid": ["prize-first-card", "prize-second-card", "prize-third-card"]
    },

    "how_to_participate": {
      "layout": "4 steps in a vertical list; on desktop, Tony image left, steps center, Windy image right",
      "steps": "Use numbered badges (1–4) with playful rounded squares",
      "data_testid": ["how-to-step-1", "how-to-step-2", "how-to-step-3", "how-to-step-4"]
    },

    "criteria": {
      "visual": "Use Recharts (PieChart or BarChart) OR pure CSS bars to show 40/20/20/20",
      "recommended": {
        "library": "recharts",
        "install": "npm i recharts",
        "chart_style": "Use solid fills: sky-600, amber-300, pink-300, slate-300; labels in slate-900",
        "empty_state": "If chart fails to load, show 4 horizontal bars with percentages"
      },
      "data_testid": ["criteria-chart", "criteria-lyrics-40", "criteria-pronunciation-20"]
    },

    "poster_mobile": {
      "use": "Mobile-only section showing /public/poster-vertical.jpg as a summary",
      "layout": "Full-width image inside rounded card; add caption + CTA",
      "data_testid": "mobile-poster-image"
    },

    "registration_form": {
      "anchor": "#register",
      "layout": "Large card with clear steps: Child/Parent info -> 6 song submissions -> consent -> submit",
      "trust": "Add small privacy note + 'We only use email for contest contact'",
      "sticky_cta": "On mobile, show sticky bottom bar with 'Register' that scrolls to submit button when user is mid-page",
      "data_testid": {
        "form": "registration-form",
        "child_name": "registration-child-name-input",
        "parent_name": "registration-parent-name-input",
        "email": "registration-email-input",
        "submit": "registration-submit-button"
      }
    },

    "footer": {
      "layout": "Soft sky wash background, contact email + YouTube link + small copyright",
      "data_testid": ["footer-contact-email", "footer-youtube-link"]
    }
  },

  "decorative_elements": {
    "rules": [
      "Decorations must never reduce readability or overlap form fields.",
      "Keep decorative gradients <=20% viewport.",
      "Prefer SVG/CSS shapes; keep them behind content (z-0) with pointer-events-none."
    ],
    "floating_notes": {
      "implementation": "Create a <FloatingDecor /> component that renders 6–10 absolutely-positioned SVG notes with slow float animation.",
      "tailwind": "pointer-events-none absolute inset-0 overflow-hidden",
      "animation": {
        "keyframes": "@keyframes floaty{0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}",
        "usage": "animate-[floaty_6s_ease-in-out_infinite] with staggered delays",
        "reduced_motion": "Respect prefers-reduced-motion: reduce (disable animation)"
      }
    },
    "cloud_dividers": {
      "implementation": "SVG wave/cloud separators between sections (top/bottom).",
      "colors": "Use white fill with subtle blue edge stroke (#DCEBFF)."
    },
    "blobs": {
      "implementation": "Large blurred circles behind sections: bg-sky-200/40, bg-amber-200/40, bg-pink-200/40",
      "classes": "absolute -z-10 blur-3xl rounded-full"
    }
  },

  "motion": {
    "principles": [
      "Gentle, delightful motion only (kids/parents).",
      "No aggressive 3D.",
      "No universal transition: never use transition-all."
    ],
    "durations": {
      "fast": "150ms",
      "base": "220ms",
      "slow": "600ms"
    },
    "easing": {
      "standard": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "entrance": "cubic-bezier(0.16, 1, 0.3, 1)"
    },
    "micro_interactions": {
      "buttons": "hover:brightness-[0.98] active:scale-[0.98] transition-colors",
      "cards": "hover:-translate-y-0.5 transition-[box-shadow]",
      "anchors": "Smooth scroll to sections; highlight active section in navbar"
    },
    "scroll_entrance": {
      "library": "framer-motion (optional)",
      "install": "npm i framer-motion",
      "pattern": "Fade-up on section enter (y: 12 -> 0, opacity: 0 -> 1) with stagger"
    }
  },

  "accessibility": {
    "wcag": "AA",
    "rules": [
      "All inputs must have visible labels (shadcn Label).",
      "Focus states must be visible (ring-2 + ring-offset-2).",
      "Do not rely on color alone for status (add icons + text).",
      "Provide alt text for all images; banners are decorative but still should have meaningful alt for context.",
      "Respect prefers-reduced-motion for floating decor and entrance animations."
    ]
  },

  "images": {
    "local_public_assets": {
      "hero_banner_vi": "/banner-horizontal-vi.jpg",
      "hero_banner_en": "/banner-horizontal-en.jpg",
      "poster_vertical": "/poster-vertical.jpg",
      "tony": "/boy-character-tony.jpg",
      "windy": "/girl-character-windy.jpg",
      "robot": "/robot-mascot.jpg"
    },
    "image_urls": [
      {
        "category": "decorative-reference",
        "description": "Optional decorative background reference (music note in sky). Use only if needed; prefer local assets + SVG.",
        "url": "https://images.unsplash.com/photo-1652626627248-2f659cdbd6cc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxraWRzJTIwc2luZ2luZyUyMGNvbnRlc3QlMjBpbGx1c3RyYXRpb24lMjBjbG91ZHMlMjBtdXNpYyUyMG5vdGVzJTIwYmFubmVyfGVufDB8fHxibHVlfDE3Nzc4MDg1MTJ8MA&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "implementation_notes_nextjs": {
    "next_image": {
      "hero": "Use <Image priority sizes=...> for hero banners; set quality ~80; provide responsive sizes.",
      "poster": "Lazy-load poster; use sizes='(max-width: 640px) 100vw, 420px'"
    },
    "i18n": {
      "recommended": "next-intl",
      "toggle_behavior": "Language toggle updates locale + swaps hero banner + persists in cookie/localStorage",
      "data_testid": "navbar-language-toggle"
    },
    "uploads": {
      "ux": "Per-song upload with progress; show remaining size/time if available; allow paste link alternative",
      "limit": "Up to 2GB; show helper text + accepted formats",
      "error_handling": "Retry per song; do not wipe other songs on one failure"
    }
  },

  "instructions_to_main_agent": [
    "Replace default CRA App.css centered header styles; do not center the whole app container.",
    "Update /app/frontend/src/index.css :root tokens to match semantic_tokens_hsl (light mode only).",
    "Use Tailwind config to add font families (Fredoka/Figtree) and optional brand colors (sky/sun/bubblegum).",
    "Build single-page landing with anchored sections per section_blueprints.",
    "Use shadcn components listed in component_path; avoid raw HTML dropdowns/calendars/toasts.",
    "Implement FloatingDecor + CloudDivider components (SVG/CSS) with prefers-reduced-motion support.",
    "Ensure every button/link/input/progress/status text has data-testid.",
    "Keep gradients decorative only (<=20% viewport) and never on small UI elements or reading areas.",
    "Use lucide-react icons (Music, Cloud, Sparkles, CheckCircle, Upload, Link2, ShieldCheck)."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
