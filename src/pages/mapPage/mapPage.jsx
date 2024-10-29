import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {GoogleMap, Marker, InfoWindow, MarkerF, MarkerClustererF, InfoWindowF} from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom'; // 추가
import Header from '../../components/shared/header.js';
import BottomNav from '../../components/shared/bottomNav.js';
import searchIcon from '../../images/search/search.png'; 
import SearchResultsPopup from '../../components/mapPage/searchResultsPopup.js';
import Footer from '../../components/footer/footer.js';

const center = {
  lat: 37.5400456,
  lng: 126.9921017
};

function MapPage() {
  const [map, setMap] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [markers, setMarkers] = useState([]); 
  const [places, setPlaces] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('토큰이 없습니다. 로그인 페이지로 이동합니다.');
      navigate('/login');
      return;

    }
  }, [navigate]);

  const handleSearch = () => {
    if (map && searchInput) {
      const service = new window.google.maps.places.PlacesService(map);
      const request = {
        query: searchInput,
        fields: ['name', 'geometry', 'formatted_address', 'rating', 'photos'],
        language: 'ko'
      };
  
      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          // console.log('Search results:', results);
          const newMarkers = results.map(result => ({
            position: result.geometry.location,
            name: result.name,
            address: result.formatted_address
          }));
          // console.log('New markers:', newMarkers);
          setMarkers(newMarkers);
          setPlaces(results); 
          setIsPopupOpen(true);
          setIsSearchComplete(true); 
          if (results[0]) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(12);
          }
        } else {
          console.error('Places Service failed:', status);
          alert("검색 결과가 없습니다!")
        }
      });
    } else {
      console.warn('Map is not loaded or searchInput is empty.');  
    }
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMarkerClick = (marker) => {
    // console.log('Marker clicked:', marker);
    setSelectedPlace(marker);
  };

  const handleInfoWindowClose = () => {
    setSelectedPlace(null);
  };

  const handleResultClick = (place) => {
    if (map && place.geometry.location) {
      map.setCenter(place.geometry.location);
      map.setZoom(15);
      setIsPopupOpen(false);
    }
  };

  const handlePopupToggle = () => {
    setIsPopupOpen(!isPopupOpen);  
  };

  return (
    <Content>
      <Container>
        <Header />
        <SearchContainer>
          <SearchInput 
            type="text" 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target?.value)}
            onKeyPress={handleKeyPress} 
            placeholder="장소, 주소를 입력하세요" 
          />
          <SearchIcon src={searchIcon} onClick={handleSearch} alt="search icon" />
        </SearchContainer>
        <MapButtonContainer>
          {isSearchComplete && (
            <PopupToggleButton onClick={handlePopupToggle}>
              {isPopupOpen ? '리스트로 보기' : '리스트로 보기'}
            </PopupToggleButton>
          )}
          <GoogleMap
            mapContainerStyle={isSearchComplete ? containerStyleWithButton : containerStyle}
            center={center}
            zoom={10}
            onLoad={map => setMap(map)}
            options={{streetViewControl:false,mapTypeControl:false,styles:[{featureType:"poi",stylers:[{visibility:'off'}]}], gestureHandling: 'greedy'
          }}

          >
            {markers.length > 0 ? markers.map((marker, index) => (
              <Marker
                key={index} 
                position={marker.position}  
                onClick={() => handleMarkerClick(marker)}
                animation={2}
              />
            )) : (
                ""
              // console.log('No markers to display')
            )}

            {selectedPlace && (
              <InfoWindow
                ariaLabel={selectedPlace.name}
                position={selectedPlace.position}
                onCloseClick={handleInfoWindowClose}
              >
                <InfoWindowContent
                    // style = {{marginTop:"-20px"}}
                >
                  <h3>{selectedPlace.name}</h3>
                  <p>{selectedPlace.address}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps에서 열기
                  </a>
                </InfoWindowContent>
              </InfoWindow>
            )}
          </GoogleMap>
          <Footer />
        </MapButtonContainer>
        <BottomPadding />
        <BottomNav />
        <SearchResultsPopup 
          isOpen={isPopupOpen} 
          onClose={() => setIsPopupOpen(false)} 
          searchResults={places} 
          onResultClick={handleResultClick}
        />
      </Container>
    </Content>
  );
}

export default React.memo(MapPage);

const containerStyle = {
  width: '390px',
  height: '80vh'  
};

const containerStyleWithButton = {
  width: '390px',
  height: '70vh'  
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 390px;
  background-color: #fff; 
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  text-align: center;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  width: 360px;
  padding-bottom: 10px;
  padding-left: 15px;
  padding-right: 15px;
  background-color: #fff;
`;

const MapButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 13px;
  border: 1px solid #ccc;
  border-radius: 50px;
  font-size: 16px;
  width: 200px;
  outline: none;
  
  &:focus {
    outline: none;
  }
`;

const SearchIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-left: -40px;
  margin-right: 10px;
  cursor: pointer;
`;

const BottomPadding = styled.div`
  height: 80px;
`;



const InfoWindowContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  
  h3 {
    margin: 0 0 10px;
    font-size: 16px;
  }
  p {
    margin: 0 0 10px;
    font-size: 14px;
  }
  a {
    color: #007BFF;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const PopupToggleButton = styled.button`
  margin-bottom: 10px;  
  width: 310px;
  padding: 10px 20px;
  font-size: 16px;
  background-color: #fff;
  color: #000;
  border: 1px solid #ccc; 
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease; 

  &:hover {
    background-color: #e0e0e0; 
    color: #000; 
  }
`;
