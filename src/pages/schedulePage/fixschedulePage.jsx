import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import Header from '../../components/shared/header.js';
import BottomNav from '../../components/shared/bottomNav.js';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance.js';

const FixSchedulePage = () => {
  const { travelRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { schedule } = location.state || {};
  const [titleError, setTitleError] = useState(''); // 제목 에러 상태 추가


  const [title, setTitle] = useState(schedule?.name || '');
  const [startDate, setStartDate] = useState(schedule?.startDate || '');
  const [endDate, setEndDate] = useState(schedule?.endDate || '');
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
  
    // 제목이 15자 이하인지 확인
    if (title.length > 15) {
      setTitleError('제목은 15자 이내로 입력해주세요.');
      setIsButtonEnabled(false);
    } else {
      setTitleError('');
    }
  
    // 시작일과 종료일 검증
    if (startDate && startDate < today) {
      setStartDate(today); // 시작일은 오늘 이후로만 설정
    }
    if (endDate && endDate < startDate) {
      setEndDate(startDate); // 종료일은 시작일 이후로만 설정
    }
  
    const diffInDays = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    if (diffInDays > 90) {
      alert('일정은 최대 90일까지 가능합니다.');
      setIsButtonEnabled(false);
    } else if (title && startDate && endDate && !titleError) {
      setIsButtonEnabled(true);
    } else {
      setIsButtonEnabled(false);
    }
  }, [title, startDate, endDate]);
  
  const handleUpdateSchedule = async () => {
    if (!isButtonEnabled) return;

    const token = localStorage.getItem('accessToken'); 

    // 디버깅 로그 추가
    // console.log('수정하려는 일정 ID:', travelRoomId);
    // console.log('수정하려는 제목:', title);
    // console.log('수정하려는 시작 날짜:', startDate);
    // console.log('수정하려는 종료 날짜:', endDate);

    try {
      const response = await axiosInstance.post(
        `/api/rooms/${travelRoomId}`, 
        {
          name: title,
          startDate: startDate.replace(/-/g, '.'),
          endDate: endDate.replace(/-/g, '.'),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json', 
          },
          withCredentials: true 
        }
      );

   
      // console.log('서버 응답 상태 코드:', response.status);
      // console.log('서버 응답 데이터:', response.data);

      if (response.status === 200) { 
        // console.log('일정 수정 완료:', response.data);
        navigate(`/schedule/${travelRoomId}`);
      }
    } catch (error) {
   
      console.error('일정 수정 중 오류 발생:', error);

      if (error.response) {
        console.error('서버 에러 응답 데이터:', error.response.data);
        console.error('서버 에러 상태 코드:', error.response.status);
      }
    }
  };

  const handleBackClick = () => {
    navigate(`/schedule/${travelRoomId}`);
  };

  return (
    <Container>
      <Header showBackButton={true} onBackClick={handleBackClick} />
      <ContentWrapper>
        <Title>여행 일정 수정하기</Title>
        <InputField>
          <Label>여행 제목</Label>
          <Input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="새로운 여행 제목을 입력하세요" 
          />
            {titleError && <HelperText>{titleError}</HelperText>}
        </InputField>
        <InputField>
          <Label>시작 날짜</Label>
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            min={today}
          />
        </InputField>
        <InputField>
          <Label>종료 날짜</Label>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            min={startDate || today}
          />
        </InputField>
        <CreateButton 
          onClick={handleUpdateSchedule} 
          disabled={!isButtonEnabled} 
          enabled={isButtonEnabled}
        >
          일정 수정하기
        </CreateButton>
      </ContentWrapper>
      <BottomNav />
    </Container>
  );
};

export default FixSchedulePage;

// 스타일 컴포넌트 정의

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #fafafa;
`;

const ContentWrapper = styled.div`
  width: 350px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  padding: 20px;
  position: relative; /* BackButton 위치를 위해 relative 설정 */
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 30px;
  margin-top: 30px;
  text-align: center;
`;

const InputField = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const Label = styled.label`
  font-size: 16px;
  color: #333;
  margin-bottom: 5px;
  display: block;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
  outline: none;  

  &:focus {
    border: 2px solid #f12e5e;
  }
`;

const buttonEnableAnimation = keyframes`
  from {
    transform: scale(0.95);
    opacity: 0.7;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 15px;
  font-size: 18px;
  background-color: ${({ enabled }) => (enabled ? '#f12e5e' : '#ccc')};
  color: #fff;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: ${({ enabled }) => (enabled ? 'pointer' : 'not-allowed')};
  margin-top: 30px;
  outline: none;
  transition: background-color 0.3s ease;
  animation: ${({ enabled }) => (enabled ? buttonEnableAnimation : 'none')} 0.3s ease;

  &:hover {
    background-color: ${({ enabled }) => (enabled ? '#d11a45' : '#ccc')};
  }
`;

const helperFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const HelperText = styled.p`
  font-size: 12px;
  color: #f12e5e;
  margin-top: 5px;
  animation: ${helperFadeIn} 0.3s ease-in-out;
`;