import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-sm text-muted-foreground">Terms and conditions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Gradlify Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing and using Gradlify, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to these terms, please 
                  do not use our service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                <p className="text-muted-foreground mb-4">
                  {AI_FEATURE_ENABLED
                    ? "Gradlify is an AI-powered study buddy platform designed to help GCSE students,"
                    : "Gradlify is a study buddy platform designed to help GCSE students,"} 
                  particularly in GCSE Mathematics. Our service includes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{AI_FEATURE_ENABLED ? 'AI-powered question answering and explanations' : 'Practice questions and explanations'}</li>
                  <li>Study progress tracking and exam readiness metrics</li>
                  <li>Personalized study recommendations</li>
                  <li>Premium subscription features</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
                <p className="text-muted-foreground mb-4">
                  To use our service, you must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your password</li>
                  <li>Be at least 13 years old, or have parental consent</li>
                  <li>Use the service only for educational purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Usage Limits and Fair Use</h2>
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2">Free Plan:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{AI_FEATURE_ENABLED ? '10 AI questions per day' : '10 questions per day'}</li>
                    <li>Basic study tracking</li>
                    <li>Standard response time</li>
                  </ul>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Premium Plan (£7.99/month):</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{AI_FEATURE_ENABLED ? '100 AI questions per day' : '100 questions per day'}</li>
                    <li>Detailed explanations and working</li>
                    <li>Advanced exam readiness tracking</li>
                    <li>Priority support</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Academic Integrity</h2>
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="text-warning font-medium mb-2">Important Notice</p>
                  <p className="text-sm text-muted-foreground">
                    Gradlify is designed as a study aid and learning tool. Students are responsible 
                    for using our service ethically and in accordance with their school's academic 
                    integrity policies. Do not use our service to complete assignments, homework, 
                    or exams without proper attribution.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Payment and Subscriptions</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Subscription fees are processed securely through Stripe</li>
                  <li>Subscriptions auto-renew monthly unless cancelled</li>
                  <li>You can cancel your subscription at any time</li>
                  <li>Refunds are subject to our refund policy</li>
                  <li>Price changes will be communicated 30 days in advance</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Prohibited Uses</h2>
                <p className="text-muted-foreground mb-4">You may not use our service to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Share inappropriate or harmful content</li>
                  <li>{AI_FEATURE_ENABLED ? 'Attempt to reverse engineer or exploit our AI systems' : 'Attempt to reverse engineer or exploit our systems'}</li>
                  <li>Create multiple accounts to circumvent usage limits</li>
                  <li>Resell or redistribute our service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
                <p className="text-muted-foreground">
                  We reserve the right to terminate or suspend your account at our sole discretion, 
                  without notice, for conduct that we believe violates these Terms of Service or 
                  is harmful to other users, us, or third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  Gradlify is provided "as is" without any warranties. We are not responsible for 
                  exam results, academic performance, or any decisions made based on our responses. 
                  Always verify important information with official sources.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="font-medium">Gradlify Support Team</p>
                  <p className="text-muted-foreground">Email: hr@jnpsolutions.co.uk</p>
                  <p className="text-muted-foreground">Phone: 07442194299</p>
                  <p className="text-muted-foreground">Response time: Within 24 hours</p>
                </div>
              </section>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-8">
                <p className="text-sm">
                  <strong>Note:</strong> These are demo terms of service. In a real application, 
                  ensure legal review and compliance with applicable laws and regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
