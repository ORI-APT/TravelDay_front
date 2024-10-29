import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import BottomNav from '../../components/shared/bottomNav.js';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoMenuOutline } from "react-icons/io5";
import Sidebar from '../../components/chatPage/sideBar.js';
import axiosInstance from "../../utils/axiosInstance";

const linkify = (text) => {
  const urlPattern = /https?:\/\/[^\s]+/g;
  return text.split(urlPattern).map((part, index) => {
    const match = text.match(urlPattern);
    if (match && match[index]) {
      return (
        <React.Fragment key={index}>
          {part}
          <StyledLink href={match[index]} target="_blank" rel="noopener noreferrer">
            {match[index]}
          </StyledLink>
        </React.Fragment>
      );
    }
    return part;
  });
};

const ChatPage = ({ travelRoomId, nickname }) => {  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // WebSocket 연결 상태를 관리하는 상태 변수
  const [isSending, setIsSending] = useState(false); // 메시지 전송 중 상태를 관리하는 상태 변수
  const navigate = useNavigate();
  const messageEndRef = useRef(null);
  const messageListRef = useRef(null);
  const socketRef = useRef(null); // WebSocket 인스턴스를 저장할 Ref

  const token = localStorage.getItem('accessToken');
  const MAX_RETRY_COUNT = 5; // 최대 재연결 시도 횟수
  const RETRY_DELAY = 2000; // 재연결 시도 간격

  useEffect(() => {
    let retryCount = 0; // 재연결 시도 횟수를 추적

    const connectWebSocket = () => {
      // WebSocket 인스턴스를 생성하여 연결
      socketRef.current = new WebSocket(`ws://thetravelday.co.kr/ws-chat/topic/rooms/${travelRoomId}`);

      // WebSocket이 성공적으로 연결되었을 때 호출되는 함수
      socketRef.current.onopen = () => {
        // console.log('WebSocket 연결 성공 (코드 101)');
        setIsConnected(true); // 연결 상태를 true로 설정
        retryCount = 0; // 연결에 성공하면 재시도 횟수를 초기화

        // 구독 메시지 전송
        socketRef.current.send(JSON.stringify({ type: 'SUBSCRIBE', roomId: travelRoomId }));
      };

      // WebSocket을 통해 메시지를 수신할 때 호출되는 함수
      socketRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data); // 수신된 메시지를 JSON으로 파싱
        setMessages((prevMessages) => [...prevMessages, message]); // 수신된 메시지를 상태에 추가
      };

      // WebSocket에서 오류가 발생했을 때 호출되는 함수
      socketRef.current.onerror = (error) => {
        console.error('WebSocket 에러 (코드 1001):', error);
      };

      // WebSocket 연결이 닫혔을 때 호출되는 함수
      socketRef.current.onclose = (event) => {
        if (event.code === 1000) {
          console.warn('WebSocket 연결 정상 종료 (코드 1000):', event);
        } else if (event.code === 1001) {
          console.error('WebSocket 서버 에러로 연결 종료 (코드 1001):', event);
        }
        setIsConnected(false); // 연결 상태를 false로 설정

        // 비정상적인 종료 시 재연결 시도
        if (retryCount < MAX_RETRY_COUNT) {
          setTimeout(() => {
            retryCount++; // 재연결 시도 횟수 증가
            connectWebSocket(); // 재연결 시도
          }, RETRY_DELAY * retryCount); // 점진적 딜레이를 적용하여 재연결 시도
        } else {
          console.error('WebSocket 재연결 실패: 최대 재시도 횟수 초과');
        }
      };
    };

    connectWebSocket(); // WebSocket 연결 시도

    // 컴포넌트가 언마운트될 때 WebSocket 연결을 해제하는 함수
    return () => {
      if (socketRef.current) {
        socketRef.current.close(); // WebSocket 연결 해제
      }
    };
  }, [travelRoomId]); // travelroom_id가 변경될 때마다 WebSocket 연결을 재설정

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await axiosInstance.get(`/api/rooms/${travelRoomId}/chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        });
  
        // API 응답의 data 속성에서 메시지 데이터를 추출
        const messages = response.data.data.map(msg => ({
          ...msg,
          content: msg.message,  // message를 content로 변환
          timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : null, // createdAt을 ISO string으로 변환, null이면 그대로 유지
          sender: msg.senderNickname // senderNickname을 sender로 매핑
        }));
  
        setMessages(messages); // 변환된 메시지 데이터를 상태에 저장
      } catch (error) {
        console.error('채팅 내역을 불러오지 못했습니다:', error);
      }
    };
  
    fetchChatHistory(); // 컴포넌트 마운트 시 채팅 내역을 불러옴
  }, [travelRoomId, token]); // travelroom_id 또는 token이 변경될 때마다 채팅 내역을 다시 불러옴
  

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() !== '' && !isSending) {
      setIsSending(true); // 메시지 전송 상태를 true로 설정
      const messageData = {
        sender: nickname, // sender를 nickname으로 설정
        content: newMessage,
        timestamp: new Date().toISOString(),
      };

      try {
        // WebSocket을 통해 메시지 전송
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(messageData));
        } else {
          console.error('WebSocket이 열려있지 않습니다.');
        }

        setNewMessage(''); // 메시지 입력 필드를 초기화
      } catch (error) {
        console.error('메시지 전송 실패:', error);
      } finally {
        setIsSending(false); // 메시지 전송 완료 후 상태를 false로 설정
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage(e); // 엔터 키를 누르면 메시지 전송
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(); // 엔터 키를 누르면 검색 수행
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const formattedHours = hours % 12 || 12; 
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${formattedHours}시 ${formattedMinutes}분`;
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  const isSameSenderAndTime = (currentMessage, previousMessage) => {
    if (!previousMessage) return false;

    return (
      currentMessage.sender === previousMessage.sender &&
      formatTime(new Date(currentMessage.timestamp)) === formatTime(new Date(previousMessage.timestamp))
    );
  };

  const isSameDay = (currentMessage, previousMessage) => {
    if (!previousMessage) return false;

    const currentDate = formatDate(new Date(currentMessage.timestamp));
    const previousDate = formatDate(new Date(previousMessage.timestamp));

    return currentDate === previousDate;
  };

  const handleBackButtonClick = () => { 
    navigate(-1); // 뒤로 가기 버튼 클릭 시 이전 페이지로 이동
  };

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible); // 검색 창 토글
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible); // 사이드바 토글
  };

  const handleSearch = () => {
    if (searchTerm.trim() === '') return;

    const results = messages.reduce((acc, message, index) => {
      if (message.content.includes(searchTerm)) {
        acc.push(index);
      }
      return acc;
    }, []);

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0 && messageListRef.current) {
      const messageElements = messageListRef.current.children;
      if (messageElements[results[0]]) {
        messageElements[results[0]].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleNextSearchResult = () => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);

    if (messageListRef.current) {
      const messageElements = messageListRef.current.children;
      if (messageElements[searchResults[nextIndex]]) {
        messageElements[searchResults[nextIndex]].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handlePreviousSearchResult = () => {
    if (searchResults.length === 0) return;

    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);

    if (messageListRef.current) {
      const messageElements = messageListRef.current.children;
      if (messageElements[searchResults[prevIndex]]) {
        messageElements[searchResults[prevIndex]].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleCancelSearch = () => {
    setIsSearchVisible(false); // 검색 창 닫기
    setSearchTerm(''); // 검색어 초기화
  };

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' }); // 새 메시지가 수신되면 스크롤을 맨 아래로 이동
    }
  }, [messages]);

  return (
    <Container>
      <ChatContainer>
        <Navbar>
          <BackButton onClick={handleBackButtonClick}>뒤로</BackButton>
          <RoomTitle>채팅방 이름</RoomTitle>
          <IconsContainer>
            <IoSearch size={22} onClick={toggleSearch} />  
            <IoMenuOutline size={22} onClick={toggleSidebar} /> 
          </IconsContainer>
        </Navbar>

        {!isConnected && <ConnectionStatus>연결이 끊겼습니다. 재연결 시도 중...</ConnectionStatus>}

        {isSearchVisible && (
          <SearchContainer>
            <SearchInput 
              placeholder="메시지 검색하기" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <SearchControls>
              <SearchButton onClick={handlePreviousSearchResult}>이전</SearchButton>
              <SearchButton onClick={handleNextSearchResult}>다음</SearchButton>
            </SearchControls>
            <CancelButton onClick={handleCancelSearch}>취소</CancelButton>
          </SearchContainer>
        )}

        <MessageList ref={messageListRef}>
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            const showSender = !isSameSenderAndTime(message, previousMessage);
            const showTimestamp = !isSameSenderAndTime(message, nextMessage);
            const showDate = !isSameDay(message, previousMessage) || index === 0;

            const isHighlighted = searchResults.includes(index);
            const isActiveResult = isHighlighted && index === searchResults[currentSearchIndex];

            return (
              <React.Fragment key={index}>
                {showDate && (
                  <DateSeparator>{formatDate(new Date(message.timestamp))}</DateSeparator>
                )}
                <MessageItem isOwnMessage={message.sender === nickname} isActiveResult={isActiveResult}>
                  {showSender && (
                    <MessageSender>{message.sender}</MessageSender>
                  )}
                  <MessageWrapper isOwnMessage={message.sender === nickname}>
                    <MessageContent isOwnMessage={message.sender === nickname}>
                      {linkify(message.content)}
                    </MessageContent>
                    {showTimestamp && (
                      <MessageTimestamp isOwnMessage={message.sender === nickname}>
                        {formatTime(new Date(message.timestamp))}
                      </MessageTimestamp>
                    )}
                  </MessageWrapper>
                </MessageItem>
              </React.Fragment>
            );
          })}
          <div ref={messageEndRef} />
        </MessageList>

        <MessageInputContainer>
          <MessageInput 
            type="text" 
            placeholder="메시지를 입력하세요..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress} 
            disabled={!isConnected || isSending} // 연결이 끊겼거나 전송 중일 때 입력 비활성화
          />
          <SendButton onClick={handleSendMessage} disabled={!isConnected || isSending}>
            {isSending ? '전송 중...' : '전송'}
          </SendButton>
        </MessageInputContainer>
      </ChatContainer>

      <Sidebar isSidebarVisible={isSidebarVisible} toggleSidebar={toggleSidebar} />

      <BottomNav /> 
    </Container>
  );
};

export default ChatPage;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin: 0 auto;
  background-color: #fafafa;
  position: relative;
  overflow-y: auto;

   &::-webkit-scrollbar {
    display: none;
  }
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 390px;
  height: calc(100vh - 130px);
  padding-bottom: 70px;
`;

const MessageList = styled.div`
  flex: 1;
  padding: 100px 20px 10px 20px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
  overflow-y: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const StyledLink = styled.a`
  color: #fff;
  text-decoration: underline;

  &:hover {
    text-decoration: none;
  }
`;

const Navbar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #007bff;
  color: #fff;
  position: fixed;
  top: 0;
  width: 100%;
  max-width: 390px;
  z-index: 10;
`;

const RoomTitle = styled.h2`
  flex-grow: 1; 
  font-size: 15px;
  margin: 0;
  text-align: center; 
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

const IconsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-right: 20px;

  svg {
    cursor: pointer;
    transition: color 0.3s ease, transform 0.3s ease;
  }

  svg:hover {
    color: #0056b3;
    transform: scale(1.1);
  }
`;

const BackButton = styled.button`
  padding: 6px 20px;
  background-color: transparent;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const MessageItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.isOwnMessage ? 'flex-end' : 'flex-start')};
  margin-bottom: 15px;
  border-radius: 8px;
  background-color: ${(props) => (props.isActiveResult ? '#eee' : 'transparent')};
`;

const MessageWrapper = styled.div`
  display: flex;
  align-items: end;
  flex-direction: ${(props) => (props.isOwnMessage ? 'row-reverse' : 'row')};
  position: relative;
  width: 100%;
`;

const MessageSender = styled.div`
  margin-bottom: 5px;
  color: #333;
`;

const MessageContent = styled.div`
  position: relative;
  padding: 10px 16px;
  background-color: ${(props) => (props.isOwnMessage ? '#007bff' : '#e8f0fe')};
  color: ${(props) => (props.isOwnMessage ? '#fff' : '#333')};
  border-radius: 16px;
  max-width: 70%;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;

  &:after {
    content: '';
    position: absolute;
    border-style: solid;
    border-width: ${(props) => (props.isOwnMessage ? '8px 0 8px 12px' : '8px 12px 8px 0')};
    border-color: ${(props) =>
      props.isOwnMessage ? 'transparent transparent transparent #007bff' : 'transparent #e8f0fe transparent transparent'};
    display: block;
    width: 0;
    z-index: 1;
    bottom: 8px; 
    left: ${(props) => (props.isOwnMessage ? 'auto' : '-12px')};
    right: ${(props) => (props.isOwnMessage ? '-10px' : 'auto')};
    transform: translateY(0);
  }
`;

const MessageTimestamp = styled.span`
  font-size: 10px;
  color: #999;
  margin: ${(props) => (props.isOwnMessage ? '0 8px 0 0' : '0 0 0 8px')};
`;

const MessageInputContainer = styled.div`
  display: flex;
  padding: 10px;
  border-top: 1px solid #e0e0e0;
  background-color: #fff;
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 370px;
  width: 100%;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ccc;
  border-radius: 50px;
  margin-right: 8px;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 3px rgba(0, 123, 255, 0.3);
  }

  &:disabled {
    background-color: #e0e0e0;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  padding: 12px 15px;
  background-color: ${props => props.disabled ? '#cccccc' : '#007bff'};
  color: #fff;
  border: none;
  border-radius: 50px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.disabled ? '#cccccc' : '#0069d9'};
  }
`;

const DateSeparator = styled.div`
  text-align: center;
  font-size: 12px;
  color: #999;
`;

const SearchContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px  0px ;
  background-color: #e8f0fe;
  position: fixed;
  top: 68px;
  width: 100%;
  max-width: 390px;
  z-index: 100;
`;

const SearchInput = styled.input`
  width: 70%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
`;

const SearchControls = styled.div`
  display: flex;
  gap: 5px;
`;

const SearchButton = styled.button`
  padding: 5px 10px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background-color: #0069d9;
  }
`;

const CancelButton = styled.button`
  padding: 10px;
  margin-left: 10px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: #0069d9;
  }
`;

const ConnectionStatus = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  text-align: center;
  padding: 15px;
  font-weight: bold;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 400px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  animation: fadeInOut 2s ease-in-out infinite;

  &:before {
    content: '';
    display: inline-block;
    margin-right: 10px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #721c24;
    animation: pulse 1s infinite;
  }

  @keyframes fadeInOut {
    0%, 100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;
