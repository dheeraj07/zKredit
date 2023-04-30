import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import Head from "next/head";
import { customTheme } from "@/utilities/theme";

import "@/utilities/reactCOIServiceWorker";

import "@/styles/globals.css";
import "@fontsource/arvo/400.css";
import "@fontsource/bayon/400.css";
import Layout from "./_layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider resetCSS={true} theme={customTheme}>
      <Head>
        <title>
          ZKredit - Generate anonymous zk-proofs from your credit history.
        </title>
        <meta
          name="description"
          content="ZKredit is a credit history service, providing anonymous zk-proofs of credit history for users."
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChakraProvider>
  );
}
