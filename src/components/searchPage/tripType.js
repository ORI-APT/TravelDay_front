import React from 'react';
import styled from 'styled-components';

const TripTypeSelector = ({ tripType, setTripType }) => {
  return (
    <ButtonContainer>
      <Button
        selected={tripType === 'round-trip'}
        onClick={() => setTripType('round-trip')}
      >
        인천 출발
      </Button>
      <Button
        selected={tripType === 'one-way'}
        onClick={() => setTripType('one-way')}
      >
        인천 도착
      </Button>
    </ButtonContainer>
  );
};

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  width : 360px;
  background-color:#fff;
  padding: 15px;
`;

const Button = styled.button`
  width: 75px;
  height: 40px;
  background-color: ${({ selected }) => (selected ? '#007BFF' : '#F4F4F4')};
  color: ${({ selected }) => (selected ? '#fff' : '#000')};
  border: none;
  cursor: pointer;
  border-radius: 5px;

  &:hover {
    background-color: ${({ selected }) => (selected ? '#007BFF' : '#AAAAAA')};
  }
`;

export default TripTypeSelector;
