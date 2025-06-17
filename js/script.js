$(document).ready(function () {

    let db;
    const DB_NAME = 'CardsApp';
    const DB_VERSION = 1;
    let currentUser = null;

    const adminData = {
        username: "admin",
        password: "admin2025"
    };

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function (event) {
        console.error("Database error: " + event.target.errorCode);
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;

        if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'username' });
        }

        if (!db.objectStoreNames.contains('cards')) {
            const cardsStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
            cardsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('currentUser')) {
            db.createObjectStore('currentUser', { keyPath: 'id' });
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Database opened successfully");

        checkAuth();

        if (window.location.pathname.includes('cards.html')) {
            displayCards();
        }
        
        if (window.location.pathname.includes('create.html')) {
            getCurrentUser(function(currentUser) {
                if (!currentUser) {
                    window.location.href = 'index.html';
                    return;
                }
                $('#username').text(currentUser.username);
            });
        }
    };

    $('#register-form').on('submit', function (event) {
        event.preventDefault();
    
        const username = $('#register-username').val();
        const password = $('#register-password').val();
    
        if (!username || !password) {
            alert('Заполните все поля');
            return;
        }
    
        const transaction = db.transaction(['users'], 'readwrite');
        const userStore = transaction.objectStore('users');
    
        const user = { username, password };
        const request = userStore.add(user);
    
        request.onsuccess = function () {
            alert('Вы зарегистрированы.');
            setCurrentUser({ username: user.username, isAdmin: false });
        };
    
        request.onerror = function () {
            alert('Ошибка регистрации, пользователь уже существует');
        };
    });
    
    $('#login-form').on('submit', function (event) {
        event.preventDefault();
    
        const username = $('#login-username').val();
        const password = $('#login-password').val();
    
        if (!username || !password) {
            alert('Заполните все поля.');
            return;
        }
    
        if (username === adminData.username && password === adminData.password) {
            setCurrentUser({ username: 'admin', isAdmin: true });
            return;
        }
    
        const transaction = db.transaction(['users'], 'readonly');
        const userStore = transaction.objectStore('users');
        const request = userStore.get(username);
    
        request.onsuccess = function (event) {
            const user = event.target.result;
            if (user && password === user.password) {
                setCurrentUser({ username: user.username, isAdmin: false });
            } else {
                alert('Неправильно введены данные');
            }
        };
    
        request.onerror = function () {
            alert('Ошибка при входе в систему');
        };
    });
    
    function setCurrentUser(user) {
        const transaction = db.transaction(['currentUser'], 'readwrite');
        const userStore = transaction.objectStore('currentUser');
    
        const clearRequest = userStore.clear();
    
        clearRequest.onsuccess = function () {
            const addRequest = userStore.add({ id: 1, ...user });
    
            addRequest.onsuccess = function () {
                window.location.href = 'pages/cards.html';
            };
        };
    }
    
    $(document).on('click', '.logout-btn', function () {
        const transaction = db.transaction(['currentUser'], 'readwrite');
        const userStore = transaction.objectStore('currentUser');
    
        const request = userStore.clear();
    
        request.onsuccess = function () {
            console.log('Logout successful');
            window.location.href = '../pages/login.html';
        };
    });
    
    $('.profile-btn').on('click', function () {
        $('#profile-dropdown').toggleClass('show');
    });
    
    $('#card-image').on('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $('#image-preview').attr('src', e.target.result);
                $('#image-preview-container').show();
            }
            reader.readAsDataURL(file);
        }
    });
    
    $('#create-form').on('submit', function (event) {
        event.preventDefault();
    
        const title = $('#card-title').val();
        const data = $('#card-data').val();
        const time = $('#card-time').val();
        const number = $('#card-number').val();
        const money = $('#card-money').val();
        const imageInput = $('#card-image')[0];
        let imageData = '';
    
        if (!title || !data || !time || !number || !money) {
            alert('Заполните все поля');
            return;
        }
    
        if (imageInput && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onloadend = function () {
                imageData = reader.result;
                saveCard(title, data, time, number, money, imageData);
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            saveCard(title, data, time, number, money, imageData);
        }
    });
    
    function saveCard(title, data, time, number, money, imageData) {
        getCurrentUser(function(currentUser) {
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }

            const transaction = db.transaction(['cards'], 'readwrite');
            const cardsStore = transaction.objectStore('cards');

            const newCard = {
                title,
                data,
                time,
                number,
                money,
                status: "новая",
                image: imageData,
                createdAt: new Date(),
                username: currentUser.username
            };

            const request = cardsStore.add(newCard);

            request.onsuccess = function () {

                const prices = {
                    "Табуретка": 500,
                    "Стул": 1500,
                    "Кресло": 3000,
                    "Диван": 10000
                };

                const price = prices[title];
                const totalPrice = price * number;

                alert(`Ваша заявка принята! Вы выбрали ремонт ${title} в количестве ${number} на общею сумму ${totalPrice} рублей`);
                window.location.href = 'cards.html';
            };

            request.onerror = function () {
                alert('Ошибка');
            };
        });
    }
    
    function displayCards() {
        getCurrentUser(function (currentUser) {
            if (!currentUser) {
                window.location.href = 'index.html';
                return;
            }
    
            $('#username').text(currentUser.username);
    
            if (currentUser.isAdmin) {
                document.title = 'Панель администратора';
            } else {
                document.title = 'Список заявок';
            }
    
            $('#cards-container').empty();
    
            const transaction = db.transaction(['cards'], 'readonly');
            const cardsStore = transaction.objectStore('cards');
            const request = cardsStore.getAll();
    
            request.onsuccess = function (event) {
                const cards = event.target.result;
    
                if (cards.length === 0) {
                    $('#cards-container').html('<p>Нет заявок</p>');
                } else {
                    const filteredCards = currentUser.isAdmin ? cards : cards.filter(card => card.username === currentUser.username);
    
                    if (filteredCards.length === 0) {
                        $('#cards-container').html('<p>Нет заявок</p>');
                        return;
                    }
    
                    $.each(filteredCards, function (index, card) {
                        const cardElement = $('<div>').addClass('card');
    
                        let cardContent = `
                            <h1>Заявка №${card.id}</h1>
                            <label for="card-title">Пользователь: <p class="cardText">${card.username}</p></label>
                            <label for="card-title">Тип мебели: <p class="cardText">${card.title}</p></label>
                            <label for="card-title">Дата начала работы: <p class="cardText">${card.data}</p></label>
                            <label for="card-title">Время начала работы: <p class="cardText">${card.time}</p></label>
                            <label for="card-title">Количество единиц мебели: <p class="cardText">${card.number}</p></label>
                            <label for="card-title">Способ оплаты: <p class="cardText">${card.money}</p></label>
                        `;
    
                        cardElement.html(cardContent);
    
                        if (currentUser.username === 'admin') {
                            const deleteButton = $('<button>')
                                .text('Удалить')
                                .addClass('delete-button')
                                .data('id', card.id)
                                .on('click', function () {
                                    deleteCard($(this).data('id'));
                                });
                            cardElement.append(deleteButton);
                        }
    
                        $('#cards-container').append(cardElement);
                    });
                }
            };
    
            request.onerror = function () {
                console.error("Error fetching cards");
            };
        });
    }
    
    function changeStatus(id, newStatus) {
        const transaction = db.transaction(['cards'], 'readwrite');
        const cardsStore = transaction.objectStore('cards');
    
        const request = cardsStore.get(id);
    
        request.onsuccess = function (event) {
            const card = event.target.result;
            card.status = newStatus;
    
            const updateRequest = cardsStore.put(card);
    
            updateRequest.onsuccess = function () {
                displayCards();
            };
        };
    }
    
    function deleteCard(id) {
        const transaction = db.transaction(['cards'], 'readwrite');
        const cardsStore = transaction.objectStore('cards');
    
        const request = cardsStore.delete(id);
    
        request.onsuccess = function () {
            displayCards();
        };
    }
    
    function getCurrentUser(callback) {
        const transaction = db.transaction(['currentUser'], 'readonly');
        const userStore = transaction.objectStore('currentUser');
    
        const request = userStore.get(1);
    
        request.onsuccess = function (event) {
            callback(event.target.result);
        };
    
        request.onerror = function () {
            callback(null);
        };
    }
    
    function checkAuth() {
        getCurrentUser(function(currentUser) {
            if (!currentUser) {
                if (window.location.pathname.includes('cards.html') || 
                    window.location.pathname.includes('create.html')) {
                    window.location.href = 'index.html';
                }
                return;
            }

            $('#username').text(currentUser.username);
        });
    }
    
    $(document).on('click', function (e) {
        if (!$(e.target).hasClass('profile-btn')) {
            if ($('#profile-dropdown').hasClass('show')) {
                $('#profile-dropdown').removeClass('show');
            }
        }
    });
    
});