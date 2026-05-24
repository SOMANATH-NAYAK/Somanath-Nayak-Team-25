import React from "react";
import Preloader from "../helper/Preloader";
import HeaderTwo from "../components/HeaderTwo";
import Breadcrumb from "../components/Breadcrumb";
import ValkeyCatalog from "../components/ValkeyCatalog";
import ShippingTwo from "../components/ShippingTwo";
import FooterTwo from "../components/FooterTwo";
import ColorInit from "../helper/ColorInit";
import ScrollToTop from "react-scroll-to-top";

const ValkeyCatalogPage = () => {
  return (
    <>
      {/* ColorInit */}
      <ColorInit color={true} />

      {/* ScrollToTop */}
      <ScrollToTop smooth color="#FA6400" />

      {/* Preloader */}
      <Preloader />

      {/* Header */}
      <HeaderTwo category={true} />

      {/* Breadcrumb */}
      <Breadcrumb title={"Valkey Catalog"} />

      {/* ValkeyCatalog – fetches from the Express API */}
      <ValkeyCatalog />

      {/* ShippingTwo */}
      <ShippingTwo />

      {/* FooterTwo */}
      <FooterTwo />
    </>
  );
};

export default ValkeyCatalogPage;
