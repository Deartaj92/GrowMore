import React from 'react';
import styled, { ThemeProvider, createGlobalStyle, keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  School as SchoolIcon, 
  Login as LoginIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

// Assets
import classroomImg from '../assets/classroom.png';
import activitiesImg from '../assets/activities.png';
import campusImg from '../assets/campus.png';

// NEW Assets
import solarImg from '../assets/solar.png';
import busImg from '../assets/bus.png';

// Faculty Images
import harisImg from '../assets/faculty/Muhammad Haris.png';
import zebImg from '../assets/faculty/Muharram Zeb.png';
import tajImg from '../assets/faculty/Taj Ali Khan.jpg';
import wasimImg from '../assets/faculty/Wasim Abbas.png';

const COLORS = {
  navy: '#252525',
  gold: '#c5a059',
  goldLight: '#e6d2a8',
  white: '#ffffff',
  clayBg: 'rgba(255, 255, 255, 0.05)',
  navyGradient: 'linear-gradient(135deg, #252525 0%, #1a1a1a 100%)'
};

const shine = keyframes`
  0% { left: -100%; opacity: 0; }
  10% { opacity: 0.8; }
  20% { left: 100%; opacity: 0; }
  100% { left: 100%; opacity: 0; }
`;

const scrollVertical = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, -50%, 0); }
`;

const scrollHorizontal = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
`;

const textGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@700&display=swap');
  
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Roboto, sans-serif;
    background: ${COLORS.navyGradient};
    color: ${COLORS.white};
    height: 100vh;
    overflow: hidden;
  }
`;

// Claymorphism Mixin based on App Design System
const clayCardBase = css`
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(37, 37, 37, 0.96) 18%, #1a1a1a 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 10px 24px rgba(0,0,0,0.42),
    0 2px 8px rgba(0,0,0,0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 10px 18px rgba(255, 255, 255, 0.03),
    inset 0 -10px 18px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`;

const MainWrapper = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 15px;
  box-sizing: border-box;

  @media (max-width: 1100px) {
    height: auto;
    align-items: flex-start;
    padding: 10px;
    overflow-y: auto;
  }
`;

const MainContainer = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: 
    "faculty header features"
    "faculty hero features"
    "faculty footer features";
  gap: 12px;
  max-width: 1600px;
  width: 100%;
  height: 96vh;
  align-items: stretch;

  @media (max-width: 1100px) {
    display: flex;
    flex-direction: column;
    grid-template-columns: 1fr;
    grid-template-areas: none;
    height: auto;
    max-height: none;
    gap: 12px;
  }
`;

const FacultyColumn = styled.aside`
  grid-area: faculty;
  height: 100%;
  @media (max-width: 1100px) { order: 2; height: auto; }
`;

const FeaturesColumn = styled.aside`
  grid-area: features;
  height: 100%;
  @media (max-width: 1100px) { order: 3; height: auto; }
`;

const CenterHeader = styled.div`
  grid-area: header;
  @media (max-width: 1100px) { order: 1; }
`;

const CenterHero = styled.div`
  grid-area: hero;
  display: flex;
  flex-direction: column;
  height: 100%;
  @media (max-width: 1100px) { order: 1; }
`;

const FooterArea = styled.div`
  grid-area: footer;
  @media (max-width: 1100px) { order: 10; }
`;

const ClayPanel = styled(motion.div)`
  ${clayCardBase}
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  transition: transform 0.3s ease;

  @media (max-width: 768px) {
    padding: 15px;
    height: auto;
  }
`;

const SectionTitle = styled.h2`
  color: ${COLORS.gold};
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 1rem;
  margin-bottom: 15px;
  border-left: 4px solid ${COLORS.gold};
  padding-left: 15px;
  margin-top: 0;
  z-index: 10;
`;

const SliderContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);

  @media (max-width: 1100px) {
    height: auto;
    mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
    padding: 5px 0;
  }
`;

const MarqueeContent = styled.div<{ duration: string }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${scrollVertical} ${props => props.duration} linear infinite;
  
  &:hover {
    animation-play-state: paused;
  }

  @media (max-width: 1100px) {
    flex-direction: row;
    animation: ${scrollHorizontal} ${props => props.duration} linear infinite;
    width: max-content;
  }
`;

const HeaderBox = styled(ClayPanel)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 15px;
  height: auto;
  min-height: 70px;

  @media (max-width: 1100px) {
    justify-content: space-between;
    padding: 10px;
  }
`;

const HeaderBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  justify-content: center;

  @media (max-width: 1100px) {
    justify-content: flex-start;
    gap: 12px;
    width: auto;
  }
`;

const AnimatedTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 2px;
  white-space: nowrap;
  background: linear-gradient(
    to right,
    ${COLORS.white} 0%,
    ${COLORS.gold} 25%,
    ${COLORS.goldLight} 50%,
    ${COLORS.gold} 75%,
    ${COLORS.white} 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${textGradient} 4s linear infinite;

  @media (max-width: 1100px) {
    font-size: 0.9rem;
    white-space: normal;
    letter-spacing: 1px;
    line-height: 1.3;
    text-align: left;
    -webkit-text-fill-color: ${COLORS.goldLight};
    background: none;
    animation: none;
  }
`;

const LogoIcon = styled(SchoolIcon)`
  font-size: 2.8rem !important;
  color: ${COLORS.gold};
  filter: drop-shadow(0 0 10px rgba(197, 160, 89, 0.5));

  @media (max-width: 1100px) {
    font-size: 2rem !important;
  }
`;

const HeroBanner = styled(ClayPanel)`
  background: radial-gradient(circle at center, #333, #1a1a1a);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(197, 160, 89, 0.3);
  position: relative;
  height: 100%;

  @media (max-width: 1100px) {
    min-height: 300px;
    margin-top: 0;
  }
`;

const UrduText = styled.div<{ size?: string, opacity?: number }>`
  font-family: 'Noto Nastaliq Urdu', serif;
  font-size: ${props => props.size || '3.2rem'};
  color: ${COLORS.goldLight};
  margin-bottom: 10px;
  z-index: 1;
  text-shadow: 2px 4px 10px rgba(0,0,0,0.5);
  opacity: ${props => props.opacity || 1};

  @media (max-width: 1100px) {
    font-size: 1.8rem;
    line-height: 2;
  }
`;

const CardItem = styled(motion.div)<{ delay: string }>`
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  height: 150px;
  width: 100%;
  min-height: 150px;
  ${clayCardBase}
  border-radius: 12px; /* Override large radius */

  @media (max-width: 1100px) {
    width: 220px;
    height: 160px;
    min-height: 160px;
    flex-shrink: 0;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transform: skewX(-25deg);
    animation: ${shine} 5s infinite;
    animation-delay: ${props => props.delay};
    z-index: 5;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.9;
  }
`;

const CardLabel = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  padding: 10px;
  font-weight: bold;
  color: ${COLORS.goldLight};
  font-size: 0.8rem;
  z-index: 6;
`;

const PortalBtn = styled(motion.button)<{ isMobileOnly?: boolean, isDesktopOnly?: boolean }>`
  background: linear-gradient(135deg, ${COLORS.gold} 0%, #a68540 100%);
  color: #252525;
  padding: 8px 18px;
  border-radius: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(197, 160, 89, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  z-index: 100;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(197, 160, 89, 0.5);
  }

  display: ${props => props.isMobileOnly ? 'none' : 'inline-flex'};

  @media (max-width: 1100px) {
    display: ${props => props.isDesktopOnly ? 'none' : 'inline-flex'};
    padding: 8px 12px;
    font-size: 0.8rem;
  }
`;

const FooterInfo = styled(ClayPanel)`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  font-size: 0.85rem;
  color: ${COLORS.goldLight};
  padding: 15px;
  align-items: center;
  height: auto;
  min-height: 60px;

  @media (max-width: 1100px) {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  svg { color: ${COLORS.gold}; font-size: 1.1rem; }
`;

const PublicLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const faculty = [
    { name: 'Taj Ali Khan', role: 'Section Head', img: tajImg },
    { name: 'Muhammad Haris', role: 'Senior Teacher', img: harisImg },
    { name: 'Muharram Zeb', role: 'Senior Teacher', img: zebImg },
    { name: 'Wasim Abbas', role: 'Senior Teacher', img: wasimImg }
  ];

  const features = [
    { name: 'Digital Labs', img: classroomImg },
    { name: 'Sports & Arts', img: activitiesImg },
    { name: 'Modern Campus', img: campusImg },
    { name: 'Solar Powered', img: solarImg },
    { name: 'Safe Transport', img: busImg },
    { name: 'Clean & Green', img: campusImg }
  ];

  return (
    <>
      <GlobalStyle />
      <MainWrapper>
        <MainContainer>
          
          {/* Sidebar: Faculty */}
          <FacultyColumn>
            <ClayPanel
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <SectionTitle>Faculty</SectionTitle>
              <SliderContainer>
                <MarqueeContent duration="20s">
                  {[...faculty, ...faculty].map((f, i) => (
                    <CardItem key={i} delay={`${(i * 1.5) % 5}s`}>
                      <img src={f.img} alt={f.name} />
                      <CardLabel>{f.name} <br /><span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{f.role}</span></CardLabel>
                    </CardItem>
                  ))}
                </MarqueeContent>
              </SliderContainer>
            </ClayPanel>
          </FacultyColumn>

          {/* Center Column: Header */}
          <CenterHeader>
            <HeaderBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HeaderBrand>
                <LogoIcon />
                <AnimatedTitle>
                  AL-HARAM PUBLIC SCHOOL & IQRA ACADEMY
                </AnimatedTitle>
              </HeaderBrand>

              <PortalBtn 
                isMobileOnly 
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/login')}
              >
                Login <LoginIcon />
              </PortalBtn>
            </HeaderBox>
          </CenterHeader>

          {/* Center Column: Hero */}
          <CenterHero>
            <HeroBanner
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <UrduText>ہمارا مقصد مستقبل کی تعمیر</UrduText>
              <UrduText size="2.2rem" opacity={0.8}>تعلیم کے ساتھ تربیت</UrduText>
            </HeroBanner>
          </CenterHero>

          {/* Center Column: Footer Area */}
          <FooterArea>
            <FooterInfo
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <InfoItem><LocationIcon /> Muslim City Road, Balu</InfoItem>
              <InfoItem><PhoneIcon /> 03159498390</InfoItem>
            </FooterInfo>
          </FooterArea>

          {/* Sidebar: Features */}
          <FeaturesColumn>
            <ClayPanel
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Features</SectionTitle>
                <PortalBtn 
                  isDesktopOnly
                  whileHover={{ scale: 1.05 }}
                  onClick={() => navigate('/login')}
                >
                  Login <LoginIcon />
                </PortalBtn>
              </div>
              
              <SliderContainer>
                <MarqueeContent duration="25s">
                  {[...features, ...features].map((f, i) => (
                    <CardItem key={i} delay={`${(i * 2.3) % 7}s`}>
                      <img src={f.img} alt={f.name} />
                      <CardLabel>{f.name}</CardLabel>
                    </CardItem>
                  ))}
                </MarqueeContent>
              </SliderContainer>
            </ClayPanel>
          </FeaturesColumn>

        </MainContainer>
      </MainWrapper>
    </>
  );
};

export default PublicLandingPage;
