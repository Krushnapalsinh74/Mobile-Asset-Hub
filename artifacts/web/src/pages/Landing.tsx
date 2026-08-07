import { Link } from "wouter";
import { ArrowRight, BrainCircuit, Target, Users, BarChart, CheckCircle2, Star, PlayCircle, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-surface)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      
      {/* Navbar */}
      <nav style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(226, 232, 240, 0.5)', position: 'sticky', top: 0, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px', boxShadow: 'var(--shadow-sm)' }}>KP</div>
          Knowledge Park
        </div>
        <div style={{ display: 'none', gap: '32px', alignItems: 'center', '@media(min-width: 768px)': { display: 'flex' } } as any}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>Features</a>
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>How it Works</a>
          <a href="#testimonials" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>Testimonials</a>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/login">
            <button className="btn btn-outline" style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 600, border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>Log In</button>
          </Link>
          <Link href="/login">
            <button className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 600, boxShadow: 'var(--shadow-glow)' }}>Get Started Free</button>
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        
        {/* 1. HERO SECTION */}
        <section style={{ position: 'relative', width: '100%', padding: '120px 24px 80px 24px', textAlign: 'center', overflow: 'hidden' }}>
          {/* Background decorations */}
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>
          
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '24px', color: 'var(--brand-primary)', fontWeight: 700, fontSize: '14px', marginBottom: '32px', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
              <Zap size={16} fill="currentColor" />
              The Next Generation Learning Platform
            </div>
            <h1 style={{ fontSize: '72px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.05, letterSpacing: '-2.5px', marginBottom: '24px' }}>
              Master your exams with <br/>
              <span style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>military precision.</span>
            </h1>
            <p style={{ fontSize: '22px', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto 48px auto', lineHeight: 1.6 }}>
              Knowledge Park provides professional-grade CBT environments, AI-generated mock tests, and deep analytics to guarantee your success in competitive exams.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
              <Link href="/login">
                <button className="btn btn-primary" style={{ padding: '18px 36px', borderRadius: '16px', fontSize: '18px', fontWeight: 700, boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                  Start Practicing Now <ArrowRight size={22} />
                </button>
              </Link>
              <button className="btn btn-outline" style={{ padding: '18px 32px', borderRadius: '16px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid var(--border-color)', backgroundColor: 'transparent' }}>
                <PlayCircle size={22} /> Watch Demo
              </button>
            </div>

            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'center', gap: '48px', opacity: 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}><CheckCircle2 size={20} color="var(--brand-primary)" /> No credit card required</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}><CheckCircle2 size={20} color="var(--brand-primary)" /> 14-day free trial</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}><CheckCircle2 size={20} color="var(--brand-primary)" /> Cancel anytime</div>
            </div>
          </div>
        </section>

        {/* 2. STATS BANNER */}
        <section style={{ background: 'var(--text-primary)', padding: '60px 24px', color: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, #60A5FA, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>50k+</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Students</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, #F87171, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>10M+</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Questions Solved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, #A78BFA, #F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>98%</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Success Rate</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, #34D399, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24/7</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Tutor Access</div>
            </div>
          </div>
        </section>

        {/* 3. CORE FEATURES */}
        <section id="features" style={{ padding: '100px 24px', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
              <h2 style={{ fontSize: '40px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '16px' }}>Everything you need to score higher.</h2>
              <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto' }}>We replaced outdated books and boring PDFs with dynamic, intelligent, and interactive learning tools.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
              
              <div className="card" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', transition: 'transform 0.3s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  <Target size={32} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>NTA Interface Replica</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '16px' }}>Experience the exact UI used in official JEE and NEET exams. Reduce exam-day anxiety by practicing in a completely familiar digital environment.</p>
              </div>

              <div className="card" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', transition: 'transform 0.3s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  <BrainCircuit size={32} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>AI Question Generation</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '16px' }}>Never run out of mock tests. Our proprietary AI engine generates fresh, highly relevant questions based strictly on your syllabus and desired difficulty.</p>
              </div>

              <div className="card" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', transition: 'transform 0.3s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  <BarChart size={32} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Deep Analytics</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '16px' }}>Identify your weak points instantly. Our dashboard provides topic-wise breakdown, time-spent analysis, and peer ranking comparisons.</p>
              </div>

              <div className="card" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', transition: 'transform 0.3s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                  <Users size={32} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>AI Tutor Chat</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontSize: '16px' }}>Stuck on a concept? Our built-in AI tutor explains complex topics using Socratic methods, helping you understand the 'why' behind the answer.</p>
              </div>

            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: '100px 24px', background: 'var(--bg-surface)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '64px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <h2 style={{ fontSize: '40px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '24px' }}>Seamless workflow designed for focus.</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6 }}>We eliminated friction. From selecting a topic to analyzing your results, everything takes just a few clicks.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', flexShrink: 0 }}>1</div>
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Configure your test</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>Select subjects, chapters, difficulty distribution, and test mode in our beautiful builder.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', flexShrink: 0 }}>2</div>
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Take the exam</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>Solve questions in an authentic NTA-styled interface with built-in timers and review flags.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', flexShrink: 0 }}>3</div>
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Analyze & Improve</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>Review detailed solutions, chat with the AI tutor for doubts, and track your progress over time.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 500px', background: 'var(--bg-primary)', borderRadius: '32px', padding: '40px', border: '1px solid var(--border-color)', position: 'relative' }}>
              {/* Mock UI Element */}
              <div style={{ background: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Physics Mock Test</div>
                  <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>45:00</div>
                </div>
                <div style={{ padding: '32px 24px' }}>
                  <div style={{ width: '80%', height: '12px', background: 'var(--bg-primary)', borderRadius: '6px', marginBottom: '16px' }}></div>
                  <div style={{ width: '60%', height: '12px', background: 'var(--bg-primary)', borderRadius: '6px', marginBottom: '40px' }}></div>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--brand-primary)' }}></div>
                    <div style={{ width: '40%', height: '20px', background: 'var(--bg-primary)', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--border-color)' }}></div>
                    <div style={{ width: '50%', height: '20px', background: 'var(--bg-primary)', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid var(--border-color)' }}></div>
                    <div style={{ width: '45%', height: '20px', background: 'var(--bg-primary)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'white', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ background: '#D1FAE5', color: '#10B981', padding: '8px', borderRadius: '50%' }}><CheckCircle2 size={24} /></div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Score</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>+4 Marks</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. TESTIMONIALS */}
        <section id="testimonials" style={{ padding: '100px 24px', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{ fontSize: '40px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: '16px' }}>Loved by toppers.</h2>
              <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>Don't just take our word for it.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
              {[
                { name: 'Rahul S.', exam: 'JEE Mains', text: 'The AI question generator is insane. I took over 50 mock tests in the last month and never saw a repeated question. Scored 99.8 percentile!' },
                { name: 'Priya M.', exam: 'NEET', text: 'The NTA simulator interface literally cured my exam anxiety. When I sat for the actual paper, it felt like just another practice session on Knowledge Park.' },
                { name: 'Aman K.', exam: 'CBSE Class 12', text: 'The AI Tutor explains physics concepts better than my school teachers. Being able to chat directly about a wrong answer is a game changer.' }
              ].map((review, i) => (
                <div key={i} style={{ background: 'var(--bg-surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', gap: '4px', color: '#F59E0B', marginBottom: '16px' }}>
                    <Star size={20} fill="currentColor" /><Star size={20} fill="currentColor" /><Star size={20} fill="currentColor" /><Star size={20} fill="currentColor" /><Star size={20} fill="currentColor" />
                  </div>
                  <p style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '24px', fontStyle: 'italic' }}>"{review.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'white', fontWeight: 700, fontSize: '18px', paddingLeft: '17px', paddingTop: '11px' }}>{review.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{review.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Acing {review.exam}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. CTA BOTTOM */}
        <section style={{ padding: '120px 24px', background: 'var(--brand-gradient)', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 150%, rgba(255,255,255,0.15) 0%, transparent 50%)' }}></div>
          <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '24px', lineHeight: 1.1 }}>Ready to ace your exams?</h2>
            <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', marginBottom: '48px' }}>Join thousands of students who are already learning smarter, not harder.</p>
            <Link href="/login">
              <button className="btn" style={{ padding: '20px 48px', borderRadius: '20px', fontSize: '18px', fontWeight: 800, background: 'white', color: 'var(--brand-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                Create Free Account
              </button>
            </Link>
            <p style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Takes 30 seconds. No credit card required.</p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ padding: '64px 48px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '48px' }}>
            <div style={{ maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>KP</div>
                Knowledge Park
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>The ultimate ecosystem for competitive exam preparation. Built with modern technology for ambitious students.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '64px' }}>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Product</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>NTA Simulator</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>AI Question Bank</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>Analytics Dashboard</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>Mobile App</a>
                </div>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Company</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>About Us</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>Careers</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>Contact</a>
                  <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px' }}>Blog</a>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '32px', borderTop: '1px solid var(--border-color)', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            <div>© 2026 Knowledge Park Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
