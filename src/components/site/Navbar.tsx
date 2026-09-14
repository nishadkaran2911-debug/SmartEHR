import { Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/site/ThemeProvider";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/doctors", label: "Doctors" },
  { to: "/patients", label: "Patients" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-background/75 backdrop-blur-xl dark:border-white/10 dark:bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/finalNavbarLogo.png"
            alt="Smart EHR"
            className="h-12 w-40 object-contain object-left"
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-white/5",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            size="icon"
            className="soft-surface rounded-2xl border-0 bg-transparent"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost" className="rounded-full px-5 text-sm">
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button asChild className="rounded-full px-5 shadow-[0_12px_24px_hsl(var(--primary)/0.18)]">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>

        <button
          type="button"
          className="soft-surface inline-flex h-11 w-11 items-center justify-center rounded-2xl md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/40 px-4 py-4 md:hidden dark:border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="soft-surface rounded-2xl border-0 bg-transparent"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button asChild variant="ghost" className="flex-1 rounded-full">
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  Sign In
                </Link>
              </Button>
              <Button asChild className="flex-1 rounded-full">
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  Sign Up
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
