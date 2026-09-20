import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import Hero from '../components/landing/Hero.jsx';
import Features from '../components/landing/Features.jsx';
import Pricing from '../components/landing/Pricing.jsx';
import Testimonials from '../components/landing/Testimonials.jsx';
import Faq from '../components/landing/Faq.jsx';
import Button from '../components/ui/Button.jsx';

export default function Landing() {
  return (
    <div className="gradient-bg min-h-screen bg-surface-50 dark:bg-surface-950">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <Faq />

      {/* Final CTA */}
      <section className="px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-600 p-10 text-center shadow-2xl shadow-brand-600/30 sm:p-16"
        >
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Ready to master your documents?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join thousands of professionals who switched to the smarter, faster, more beautiful way
            to work with PDFs.
          </p>
          <Link to="/dashboard" className="mt-8 inline-block">
            <Button
              size="lg"
              className="group !bg-white !from-white !to-white !text-brand-700 shadow-xl hover:!brightness-95"
            >
              Open workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
