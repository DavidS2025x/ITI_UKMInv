/// <reference path="./main.js" />

/**
 * Obrazec za spremembo gesla trenutnega uporabnika.
 * Ob nalaganju strani zapolni podatke o uporabniku in obravnava oddajo obrazca.
 */
window.addEventListener("DOMContentLoaded", () => {
    uporabnikPodatki()
    .then(data => {
        // Update navbar with user info
        updateUserDisplay(data);
        // Generate action buttons based on permissions
        addNavigationLinks(data)
        .then(() => {
            const currentWindow = window.location.pathname.split('/').pop();
            const links = document.querySelectorAll('#navLinksContainer .nav-link');
            links.forEach(link => {
                if (link.getAttribute('href').includes(currentWindow)) {
                    link.classList.add('active');
                }
            });
        });
    }).catch(err => {
        console.error('Error loading user data:', err);
    });

    // Obravnava oddaje obrazca – preveri gesli in pošlji POST na strežnik
    document.getElementById('changePasswordForm').addEventListener('submit', (event) => {
        event.preventDefault();
        
        const stareGeslo = document.getElementById('stareGeslo').value;
        const novoGeslo = document.getElementById('novoGeslo').value;
        const potrdiGeslo = document.getElementById('potrdiGeslo').value;

        // Preveri, ali se novi gesli ujemata
        if (novoGeslo !== potrdiGeslo) {
            alert('Novi gesli se ne ujemata!');
            return;
        }

        // Preveri, da novo geslo ni prazno
        if (!novoGeslo || novoGeslo.length === 0) {
            alert('Novo geslo ne sme biti prazno!');
            return;
        }

        // Preveri, da staro geslo ni prazno
        if (!stareGeslo || stareGeslo.length === 0) {
            alert('Vnesi staro geslo!');
            return;
        }

        // Preveri, ali novo geslo izpolnjuje zahteve
        const isPasswordValid = updatePasswordValidationDisplay(novoGeslo, 'passwordRequirements');
        if (!isPasswordValid) {
            alert('Geslo ne izpolnjuje zahtev za varnost!');
            document.getElementById('novoGeslo').focus();
            return;
        }

        const payload = {
            stareGeslo: stareGeslo,
            novoGeslo: novoGeslo
        };

        fetch('/spremembaGesla', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (response.ok) {
                alert('Geslo je bilo uspešno spremenjeno!');
                window.location.href = '/nadzornaPlosca';
            } else {
                response.json().then(j => {
                    console.error(j);
                    alert(j.message || 'Napaka pri spreminjanju gesla.');
                }).catch(()=>{
                    alert('Napaka pri spreminjanju gesla.');
                });
            }
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            alert('Napaka pri spreminjanju gesla.');
        });
    });

    // Ponastavljanje obrazca
    document.getElementById('changePasswordForm').addEventListener('reset', (e) => {
        document.getElementById('stareGeslo').value = '';
        document.getElementById('novoGeslo').value = '';
        document.getElementById('potrdiGeslo').value = '';
        updatePasswordValidationDisplay('', 'passwordRequirements');
        document.getElementById('novoGeslo').classList.remove('password-invalid');
    });

    // Prikaži zahteve za geslo že ob nalaganju strani
    updatePasswordValidationDisplay('', 'passwordRequirements');

    // Ob vnosu novega gesla prikaži zahteve za varnost
    document.getElementById('novoGeslo').addEventListener('input', (event) => {
        updatePasswordValidationDisplay(event.target.value, 'passwordRequirements');
    });
});
