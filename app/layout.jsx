import "../styles/global.css";
import NextTopLoader from "nextjs-toploader";
import Navbar from "../components/Navbar";
import ScrollToTop from "../components/ScrollToTop";
import Whatsapp from "../components/Whatsapp";
import Footer from "../components/Footer";
import { AuthProvider } from "../lib/AuthContext";
import { NotificationProvider } from "../components/Notification";
import Head from "next/head";
import logo from "../public/images/favicon.ico"

export const metadata = {
  title: "SHOESAFARI",
  description: "YOUR OUTFIT & FOOTWEARS",
  openGraph: {
    type: "website",
    url: "https://shoesafari.vercel.app/",
    title: "SHOESAFARI",
    description: "YOUR OUTFIT",
    images: [
      {
        url: "https://shoesafari.vercel.app/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "SHOESAFARI",
      },
    ],
  },
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href={logo} width="300px" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
     
      </Head>
      <body className="h-full">
        <NextTopLoader color="#ff0000" showSpinner={false} />

        <NotificationProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="app flex-grow pt-10">{children}</main>
              <Whatsapp />
              <ScrollToTop />
              <Footer />
            </div>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
};

export default RootLayout;
