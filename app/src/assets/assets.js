import logo from "./logo.jpeg";
import logoIcon from "./logo-icon.png";
import CEO from "./CEO.png";
import HO from "./HO.png";
import CF from "./COF.jpeg";

import facebook from "./facebook.png";
import instagram from "./instagram.png";
import youtube from "./youtube.png";
import whatsapp from "./whatsapp.png";

export const assets = {
  logo,
  logoIcon,
};

export const TEAM = [
  {
    role: "Founder & CEO",
    desc: "Damini Thakur (MBA FINANCE)",
    image: CEO,
  },
  {
    role: "Co-founder",
    desc: "Shital Kashyap (M.com Accounts)",
    image: CF,
  },
  {
    role: "Head of Operations",
    desc: "Uddhav Bhade (MBA Finance & HR)",
    image: HO,
  },
];

export const SOCIALLINKS = [
  {
    name: "Facebook",
    icons: facebook,
    links: "https://www.facebook.com/share/1XqTtsPwgG/",
  },
  {
    name: "Instagram",
    icons: instagram,
    links: "https://www.instagram.com/the_damini_edit",
  },
  {
    name: "YouTube",
    icons: youtube,
    links: "https://www.youtube.com/@thedaminiedit",
  },
  {
    name: "WhatsApp",
    icons: whatsapp,
    links: "https://wa.me/918485833094",
  },
];
