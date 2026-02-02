import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Users, MapPin, Clock, Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg">HotDesk</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Book in seconds
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-serif">
                Smart Office
                <span className="text-primary block">Desk Booking</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Effortlessly reserve your workspace with our interactive floor plan. 
                See real-time availability and book your perfect spot in just a few clicks.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                  <a href="/login">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
              <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>No credit card</span>
                </div>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent rounded-3xl" />
              <div className="relative bg-card border rounded-3xl p-8 shadow-xl">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-12 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                        [2, 5, 9, 12].includes(i)
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                          : [3, 7].includes(i)
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300"
                          : [11].includes(i)
                          ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-300"
                          : "bg-muted/50 text-muted-foreground border border-border"
                      }`}
                    >
                      T{i + 1}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Interactive Floor Plan</span>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" /> 12 Available
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything you need</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              A complete solution for managing office hot desks with ease
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Interactive Floor Plan</h3>
                <p className="text-muted-foreground">
                  Click directly on desks to book them. See real-time availability with color-coded status.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Half-Day Slots</h3>
                <p className="text-muted-foreground">
                  Book AM, PM, or full day slots. Perfect for flexible work schedules.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">See Who's In</h3>
                <p className="text-muted-foreground">
                  View who booked which desk for any day. Great for team coordination.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bulk Booking</h3>
                <p className="text-muted-foreground">
                  Book multiple seats and dates at once. Save time with batch reservations.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Admin Controls</h3>
                <p className="text-muted-foreground">
                  Manage seats, block desks, set long-term reservations. Full administrative control.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multiple Desk Types</h3>
                <p className="text-muted-foreground">
                  Solo desks, team clusters, with or without monitors. Find the right setup for you.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your office?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join teams who have simplified their desk booking process with HotDesk.
          </p>
          <Button size="lg" asChild className="gap-2" data-testid="button-cta-signup">
            <a href="/login">
              Start Booking Now <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Building2 className="h-3 w-3" />
            </div>
            <span className="text-sm font-medium">HotDesk</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HotDesk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
