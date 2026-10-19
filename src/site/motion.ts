/*
 * MOTION POLICY (round 37). Animation is the product, so the OS "Reduce motion"
 * switch never turns the site off: every entrance, draw and boil still plays.
 * It only calms the big vestibular movement: smooth-scroll inertia, scroll
 * stretch, parallax and the 3D lean. Modules ask `calm` for those, nothing else.
 */
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
