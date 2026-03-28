import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			screens: {
				'xs': '475px',
			},
		fontFamily: {
			'sans': ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
			'serif': ['"Playfair Display"', 'Georgia', 'serif'],
			'gradlify': ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
		},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					glow: 'hsl(var(--accent-glow))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				connect: {
					gold: 'hsl(var(--connect-gold))',
					silver: 'hsl(var(--connect-silver))',
					bronze: 'hsl(var(--connect-bronze))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-gradlify': 'var(--gradient-gradlify)',
				'gradient-border': 'var(--border-gradient)'
			},
			boxShadow: {
				'primary': 'var(--shadow-primary)',
				'success': 'var(--shadow-success)',
				'card': 'var(--shadow-card)',
				'glow': 'var(--shadow-glow)',
				'lg': 'var(--shadow-lg)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'bounce': 'var(--transition-bounce)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' 
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(var(--primary) / 0.6)' 
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'green-burst': {
					'0%': { 
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
						backgroundColor: 'transparent'
					},
					'50%': { 
						boxShadow: '0 0 60px 20px rgba(34, 197, 94, 0.15)',
						backgroundColor: 'rgba(34, 197, 94, 0.05)'
					},
					'100%': { 
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
						backgroundColor: 'transparent'
					}
				},
				'red-burst': {
					'0%': { 
						boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
						backgroundColor: 'transparent'
					},
					'50%': { 
						boxShadow: '0 0 60px 20px rgba(239, 68, 68, 0.15)',
						backgroundColor: 'rgba(239, 68, 68, 0.05)'
					},
					'100%': { 
						boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
						backgroundColor: 'transparent'
					}
				},
				'fadeIn': {
					'from': { opacity: '0', transform: 'translateY(8px)' },
					'to': { opacity: '1', transform: 'translateY(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'green-burst': 'green-burst 0.6s ease-out',
				'red-burst': 'red-burst 0.6s ease-out',
				'fade-in': 'fadeIn 0.4s ease forwards'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
