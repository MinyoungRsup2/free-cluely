import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { clsx } from "clsx"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={clsx(
        "z-50 min-w-[8rem] overflow-hidden p-1 text-white shadow-2xl",
        // Glassmorphic background with Apple-inspired styling
        "rounded-[35px] backdrop-blur-xl border border-white/20",
        "bg-gradient-to-b from-[rgba(245,245,245,0.4)] to-[rgba(245,245,245,0.4)]",
        "relative before:absolute before:inset-0 before:rounded-[35px] before:bg-[#0F0F0F] before:mix-blend-color-dodge before:-z-10",
        // Enhanced animations with glass liquid feel
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]",
        "data-[state=closed]:duration-300 data-[state=open]:duration-300",
        "data-[side=bottom]:slide-in-from-top-3 data-[side=left]:slide-in-from-right-3",
        "data-[side=right]:slide-in-from-left-3 data-[side=top]:slide-in-from-bottom-3",
        // Subtle inner glow
        "after:absolute after:inset-[1px] after:rounded-[34px] after:bg-gradient-to-b after:from-white/10 after:to-transparent after:pointer-events-none",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={clsx(
      "relative flex cursor-default select-none items-center rounded-[18px] mx-2 my-1 px-4 py-2.5 text-sm outline-none",
      "transition-all duration-200 ease-out",
      // Glass liquid hover effect
      "hover:bg-white/20 hover:backdrop-blur-sm hover:shadow-lg hover:scale-[1.02]",
      "focus:bg-white/25 focus:backdrop-blur-sm focus:shadow-lg focus:scale-[1.02]",
      "active:scale-[0.98] active:bg-white/30",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      // Subtle inner highlight on hover
      "hover:after:absolute hover:after:inset-[1px] hover:after:rounded-[17px] hover:after:bg-gradient-to-b hover:after:from-white/15 hover:after:to-transparent hover:after:pointer-events-none",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={clsx(
      "mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent",
      "relative after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:blur-[0.5px]",
      className
    )}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}