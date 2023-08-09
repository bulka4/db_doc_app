async function search(e){
    const searchedQuery = e.value
    const tables = document.querySelectorAll('.list-group-item')
    tables.forEach(table => {
        isVisible = table.querySelector('a').innerHTML.includes(searchedQuery)
        table.classList.toggle('hide', !isVisible)
    })
}
