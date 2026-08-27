import "./slider.scss";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Pagination, Navigation, Autoplay } from "swiper";

const Slider = () => {
  const { t } = useTranslation("home");
  const slider = t("slider", { returnObjects: true });
  return (
    <Swiper
      effect="fade"
      pagination={{ clickable: true }}
      navigation={true}
      modules={[EffectFade, Pagination, Navigation, Autoplay]}
      autoplay={{
        delay: 5000,
        disableOnInteraction: false,
      }}
      className="slider"
    >
      {slider.map((item, index) => (
        <SwiperSlide key={index}>
          <div className="content">
            <h2>{item.title}</h2>
            <p>{item.subtitle}</p>
          </div>
          <img src={`/img/${item.image}`} alt={item.title} title={item.title} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default Slider;
