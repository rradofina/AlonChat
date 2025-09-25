'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Bot,
  MessageSquare,
  Zap,
  Shield,
  Globe,
  BarChart3,
  Users,
  Code,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Brain,
  Gauge,
  Lock,
  HeartHandshake,
  Star
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          // If user is logged in, redirect to dashboard
          router.push('/dashboard')
        }
        setIsLoggedIn(!!data.user)
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold">AlonChat</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                Documentation
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Powered by Advanced AI Models
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              AI agents for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
                magical customer experiences
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Build and deploy intelligent chatbots that understand your business,
              engage customers naturally, and drive real results.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Start Building Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" /> Live Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              No credit card required • 14-day free trial • Setup in 5 minutes
            </p>
          </div>

          {/* Platform Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gray-900 rounded-xl shadow-2xl p-2">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-gray-400 text-sm">alonchat.ai/dashboard</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Your AI Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              The complete platform for AI support agents
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create, train, and deploy intelligent customer support
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Intelligent Training</h3>
              <p className="text-gray-600 mb-4">
                Upload documents, websites, or Q&A pairs. Your agent learns instantly from your content.
              </p>
              <Link href="/features/training" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Natural Conversations</h3>
              <p className="text-gray-600 mb-4">
                Powered by GPT-4 and Claude for human-like interactions that understand context.
              </p>
              <Link href="/features/ai-models" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Deployment</h3>
              <p className="text-gray-600 mb-4">
                Embed on any website with a single line of code. Works everywhere instantly.
              </p>
              <Link href="/features/deployment" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4">
                Track conversations, sentiment, and performance with detailed insights.
              </p>
              <Link href="/features/analytics" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-600 mb-4">
                SOC 2 compliant with end-to-end encryption and data privacy controls.
              </p>
              <Link href="/features/security" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-language</h3>
              <p className="text-gray-600 mb-4">
                Support customers globally with 95+ languages automatically detected.
              </p>
              <Link href="/features/languages" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              An end-to-end solution for conversational AI
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From training to deployment, manage everything in one powerful platform
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Upload Your Knowledge Base</h3>
                    <p className="text-gray-600">
                      Import documents, PDFs, websites, or create Q&A pairs. Your agent learns from all your content instantly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Customize Agent Behavior</h3>
                    <p className="text-gray-600">
                      Set personality, tone, and specific instructions. Choose from GPT-4, Claude, or other AI models.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Deploy Anywhere</h3>
                    <p className="text-gray-600">
                      Embed on your website, integrate with Slack, WhatsApp, or use our API for custom integrations.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Monitor & Improve</h3>
                    <p className="text-gray-600">
                      Track conversations, analyze sentiment, collect leads, and continuously improve your agent&apos;s performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bot className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-semibold">AlonChat Assistant</h4>
                    <p className="text-sm text-gray-500">Always online</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="text-sm">Hello! How can I help you today?</p>
                  </div>
                  <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[80%] ml-auto">
                    <p className="text-sm">I need help with my order</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="text-sm">I&apos;ll be happy to help with your order. Can you provide your order number?</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button size="sm">Send</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">10M+</div>
              <div className="text-gray-600 mt-2">Conversations handled</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">50K+</div>
              <div className="text-gray-600 mt-2">Active agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">95%</div>
              <div className="text-gray-600 mt-2">Customer satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">140+</div>
              <div className="text-gray-600 mt-2">Countries served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by 9000+ businesses
            </h2>
            <p className="text-xl text-gray-600">
              From startups to Fortune 500 companies
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="text-center text-2xl font-bold text-gray-400">Company</div>
            <div className="text-center text-2xl font-bold text-gray-400">Business</div>
            <div className="text-center text-2xl font-bold text-gray-400">Startup</div>
            <div className="text-center text-2xl font-bold text-gray-400">Enterprise</div>
          </div>

          {/* Testimonial */}
          <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-2xl font-medium mb-6">
                "AlonChat transformed our customer support. We reduced response time by 80%
                and our satisfaction scores have never been higher."
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full" />
                <div className="text-left">
                  <div className="font-semibold">Sarah Johnson</div>
                  <div className="text-white/80">Head of Support, TechCorp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Build the perfect customer-facing AI agent
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of businesses using AlonChat to delight their customers
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <Bot className="h-6 w-6" />
                <span className="font-bold">AlonChat</span>
              </div>
              <p className="text-sm">
                The most powerful platform for building AI customer support agents.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white">API Reference</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
                <li><Link href="/gdpr" className="hover:text-white">GDPR</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; 2024 AlonChat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}