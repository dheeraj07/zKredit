interface NavItem {
  label: string;
  link: string;
}

export const NAV_ITEMS: Array<NavItem> = [
  {
    label: "GENERATE CREDIT PROOF",
    link: "/generate-credit-proof",
  },
  {
    label: "VERIFY CREDIT ELIGIBILTITY",
    link: "/verify-credit-eligibility",
  },
];

export const ABOUT_ITEMS: Array<NavItem> = [
  {
    label: "About",
    link: "/about",
  },
  {
    label: "Github",
    link: "https://github.com/shailesh-shenoy/wagerwinz",
  },
  {
    label: "Contract",
    link: `https://sepolia.etherscan.io/address/`,
  },
];

export type { NavItem };
