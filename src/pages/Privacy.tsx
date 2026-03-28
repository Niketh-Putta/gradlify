import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

export default function Privacy() {
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
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground">How we protect your data</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Gradlify Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us, such as when you create an account, 
                  use our services, or contact us for support.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Account information (email address, name)</li>
                  <li>Usage data (questions asked, study progress)</li>
                  <li>Payment information (processed securely by Stripe)</li>
                  <li>Device and technical information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{AI_FEATURE_ENABLED ? 'Provide and improve our AI study buddy service' : 'Provide and improve our study buddy service'}</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send important service updates and notifications</li>
                  <li>Analyze usage patterns to enhance the learning experience</li>
                  <li>Provide customer support</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organizational measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction. All data 
                  is encrypted in transit and at rest.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
                <p className="text-muted-foreground mb-4">
                  We use trusted third-party services to provide our platform:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  {AI_FEATURE_ENABLED ? (
                    <li><strong>OpenAI/Anthropic:</strong> AI-powered study assistance</li>
                  ) : null}
                  <li><strong>Stripe:</strong> Secure payment processing</li>
                  <li><strong>Vercel:</strong> Hosting and deployment</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  Under GDPR and other applicable laws, you have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Student Privacy</h2>
                <p className="text-muted-foreground">
                  We are committed to protecting student privacy. We do not share educational records 
                  or study data with third parties without explicit consent. Parents and guardians can 
                  request access to their child's data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about this Privacy Policy or our data practices, 
                  please contact us at:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 mt-3">
                  <p className="font-medium">Gradlify Privacy Team</p>
                  <p className="text-muted-foreground">Email: hr@jnpsolutions.co.uk</p>
                  <p className="text-muted-foreground">Phone: 07442194299</p>
                  <p className="text-muted-foreground">Response time: Within 48 hours</p>
                </div>
              </section>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-8">
                <p className="text-sm">
                  <strong>Note:</strong> This is a demo privacy policy. In a real application, 
                  ensure compliance with GDPR, COPPA, and other applicable privacy regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
