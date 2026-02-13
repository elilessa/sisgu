export const formatCnpjCpf = (value: string) => {
    const v = value.replace(/\D/g, '');

    if (v.length > 11) { // CNPJ
        return v
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substr(0, 18);
    } else { // CPF
        return v
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .substr(0, 14);
    }
};

export const formatTelefone = (value: string) => {
    const v = value.replace(/\D/g, '');

    // (11) 98888-8888 ou (11) 8888-8888
    if (v.length > 10) {
        return v
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2')
            .substr(0, 15);
    } else if (v.length > 5) {
        return v
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2')
            .substr(0, 14);
    } else if (v.length > 2) {
        return v.replace(/^(\d{2})(\d)/, '($1) $2');
    }
    return v;
};

export const formatCep = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .substr(0, 9);
};
