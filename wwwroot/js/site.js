/** Initialize MDC Web components. */
mdc.autoInit();

document.getElementById('search-input-id').MDCTextField.focus();

const filterChipSet = document.getElementById('filterChipSet').MDCChipSet;
filterChipSet.listen('MDCChip:removal', function (event) {
    onDeleteFilterIndex(event.detail.chipId);
});

document.getElementById('del-file-dialog').MDCDialog.listen('MDCDialog:closed', (e) => {

    if (e.detail.action === 'delete') {
        onConfirmedDeleteRelation();
    }
});

const searchResultListEl = document.getElementById('searchResultList');
var searchResultList = searchResultListEl.MDCList
searchResultList.listen('MDCList:action', (e) => {
    if (e.detail.index >= 0 && e.detail.index < searchResultList.listElements.length) {
        onAddFilterIndex(searchResultList.listElements[e.detail.index]);
    }
});

const countSelect = document.getElementById('selectCount').MDCSelect;

countSelect.selectedIndex = selectedCountIndex;

countSelect.listen('MDCSelect:change', () => {
    const form = document.forms['mainForm'];

    if (form.count.value === countSelect.value) return;

    localStorage.setItem(selectedCountName, countSelect.value);

    form.count.value = countSelect.value;
    form.offset.value = 0;
    form.submit();
});

/** MDC Web components initialization finished */

/** Управление постраничным выводом данных */
function onFirstPage(form) {
    form.offset.value = 0;
    form.submit();
}

function onLastPage(form) {
    const total = mainListTotal;

    if (total <= form.count.value) {
        return onFirstPage();
    }

    form.offset.value = (total / form.count.value >> 0) * form.count.value;
    if (total % form.count.value === 0) {
        form.offset.value -= form.count.value;
    }
    form.submit();
}

function onPrevPage(form) {
    const offset = form.offset.value - form.count.value;
    if (offset < 0) {
        return onFirstPage(form);
    }
    form.offset.value = offset;
    form.submit();
}

function onNextPage(form) {
    const total = mainListTotal;
    const offset = Number(form.offset.value) + Number(form.count.value);
    if (offset >= total) {
        return onLastPage(form);
    }
    form.offset.value = offset;
    form.submit();
}
/** Конец управление постраничным выводом данных */

/**
 * Добавление файла данных по изменениям
 * @param {any} eventId идентификатор события
 */
function onAddEventFile(eventId) {
    const form = document.forms[0];
    form.eventId.value = eventId;
    uploadDialog.open();
}

/**
 * Удаление файла данных по изменениям
 * @param {any} relationId идентификатор связи событие-файл
 */
function onDeleteRelation(relationId) {
    confirmDeleteDialog.relationId = relationId;
    confirmDeleteDialog.open();
}

/** Оправка запроса на сервер на удаление файла данных по изменениям */
function onConfirmedDeleteRelation() {

    const relationId = confirmDeleteDialog.relationId;

    confirmDeleteDialog.relationId = null;

    if (!relationId) return;

    var displayError = (err) => {
        const errId = 'err' + relationId;
        let e = document.getElementById(errId);
        if (!e) {
            e = document.createElement('div');
            relEl.appendChild(e);
        }

        e.id = 'err' + relationId;
        e.innerHTML = err;
        e.style.color = 'red';
    }

    const relEl = document.getElementById('relation' + relationId);

    const formData = new FormData();
    formData.append('id', relationId);

    fetch('/ComponentEvent/Delete', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            relEl.remove();
        } else {
            response.text().then(text => {
                if (text) {
                    displayError('Ошибка: ' + text);
                } else {
                    displayError('Ошибка: ' + response.status + ' ' +
                        response.statusText);
                }
            }).catch(() => displayError('Ошибка: ' + response.statusText));
        }
    })
    .catch((error) => {
        displayError('Ошибка: ' + error);
    });
}

/**
 * Обработчик события выбора файла в диалоге загрузки
 * @param {any} ctrl
 */
function onChangeFile(ctrl) {
    document.getElementById('fileName').value = ctrl.files[0].name;
    document.getElementById('uploadButton').disabled = !ctrl.files[0].name;
}

/**
 * Обновление состояния элементов управления диалога загрузки файлов
 * @param {any} state если true, то элеенты управленя разрешены
 */
function enableUploadDialog(state) {
    const fileUploadEl = document.getElementById('fileUploadWrapper');
    fileUploadEl.disabled = !state;

    if (state) {
        fileUploadEl.classList.remove('disabled-file-input');
    } else {
        fileUploadEl.classList.add('disabled-file-input');
    }

    document.getElementById('fileName').disabled = !state;
    document.getElementById('formFile').disabled = !state;
    document.getElementById('uploadButton').disabled = !state;

    if (uploadSelectEl) {
        if (state) {
            uploadSelectEl.classList.remove('mdc-select--disabled');
        }
        else {
            uploadSelectEl.classList.add('mdc-select--disabled');
        }
    }
}

/**
 * Оправка запроса на сервер на добавление файла данных по изменениям
 * @param {any} form форма данных, которая будет обновлена после успешной загрузки файла на сервер
 */
function onUpload(form) {

    var resultElement = form.elements.namedItem('result');

    const formData = new FormData(form);

    resultElement.value = 'Uploading file...';
    resultElement.style.color = null;

    enableUploadDialog(false);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        enableUploadDialog(true);
        if (response.ok) {
            //uploadDialog.close('uploaded');
            //window.location.href = href;
            const form = document.forms['mainForm'];
            resultElement.value = 'Файл успешно загружен';
            form.submit();
        } else {
            response.text().then(text => {
                resultElement.style.color = 'red';
                if (text) {
                    resultElement.value = 'Ошибка: ' + text;
                } else {
                    resultElement.value = 'Ошибка: ' + response.status + ' ' +
                        response.statusText;
                }
            });
        }
    }).catch((error) => {
        enableUploadDialog(true);
        resultElement.value = 'Ошибка: ' + error;
        resultElement.style.color = 'red'
    });
}

/** Свойства и методы для панели фильтра по коду или имени компонентов */
const searchResultListContainerEl = document.getElementById('searchResultListContainer');

function onSearchInputKeyDown(event) {
    switch (event.key) {
        case 'Enter':
        case 13:
            startSearch(event.target.value.trim());
            break;
        case 'Escape':
            searchResultListContainerEl.style.display = 'none';
            break;
        case 'ArrowDown':
            if (searchResultListContainerEl.style.display !== 'none') {
                searchResultListEl.children[0].focus();
            }
            break;
    }
}

function startSearch(search) {
    var itemsHtml = (result, item) => result
        + `<li class='mdc-list-item' data-id='${item.id}' data-code='${item.code}' data-name='${item.name}' tabindex='-1'>
<span class='mdc-list-item__ripple'></span>
<span class='mdc-list-item__text'>
<span class='mdc-list-item__primary-text'>${item.name}</span>
<span class='mdc-list-item__secondary-text'>${item.code}</span>
</span></li>`;

    var addItem = (name) => {
        searchResultListEl.innerHTML = itemsHtml('', { id: '', code: '', name });
    }

    if (search) {
        const formData = new FormData();
        formData.append('search', search);

        filterChipSet.chips.forEach(c => formData.append('exclude', c.id));

        fetch('/Home/Subjects', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (response.ok) {
                response.json().then(items => {
                    if (items) {
                        if (items.length < 1) {
                            addItem('Нет компонентов');
                        } else {
                            searchResultListEl.innerHTML = items.reduce(itemsHtml, '');
                            searchResultListEl.children[0].tabIndex = 0;
                        }
                    } else {
                        addItem('Нет компонентов');
                    }
                }).catch((e) => addItem('Ошибка: ' + e));

            } else {
                response.text().then(text => {
                    if (text) {
                        addItem('Ошибка: ' + text);
                    } else {
                        addItem('Ошибка: ' + response.status + ' ' +
                            response.statusText);
                    }
                }).catch(() => addItem('Ошибка: ' + response.statusText));
            }
        })
            .catch((error) => {
                addItem('Ошибка: ' + error);
            });

        searchResultListContainerEl.style.display = 'block';
    } else {
        searchResultListContainerEl.style.display = 'none';
        // Clear list
        searchResultListEl.replaceChildren();
    }
}

var searchTimerId = null;

function onSearchComponent(e) {

    clearTimeout(searchTimerId);

    let timeout = 500;
    const search = e.target.value.trim();
    switch (search.lenght) {
        case 0:
            return;
        case 1:
            timeout = 2000;
            break;
        case 2:
            timeout = 1000;
            break;
    }

    searchTimerId = setTimeout(() => {
        startSearch(search);
    }, timeout);
}

function onDeleteFilterIndex(chipId) {
    searchResultListContainerEl.style.display = 'none';

    const form = document.forms['mainForm'];
    form.offset.value = 0;
    form.subjects.value = form.subjects.value.replace(chipId, '');

    localStorage.setItem(filterSubjects, form.subjects.value);

    form.submit();
}

function onAddFilterIndex(item) {
    searchResultListContainerEl.style.display = 'none';

    const itemId = item.getAttribute('data-id');

    if (!itemId) {
        return;
    }

    const form = document.forms['mainForm'];
    form.offset.value = 0;
    form.subjects.value += (form.subjects.value.trim() ? ',' : '') + itemId;

    localStorage.setItem(filterSubjects, form.subjects.value);

    form.submit();
}
/** Конец свойства и методы для панели фильтра по коду или названию компонентов */