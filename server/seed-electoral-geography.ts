import { db } from "./db";
import { sql } from "drizzle-orm";

const NIGERIA_ELECTORAL_MAP: Record<string, {
  districts: Record<string, { lgas: string[] }>;
  constituencies: { name: string; lgas: string[] }[];
}> = {
  "Abia": {
    districts: {
      "Abia Central": { lgas: ["Umuahia North", "Umuahia South", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Osisioma"] },
      "Abia North": { lgas: ["Bende", "Arochukwu", "Ohafia", "Isuikwuato", "Umunneochi"] },
      "Abia South": { lgas: ["Aba North", "Aba South", "Obingwa", "Ugwunagbo", "Ukwa East", "Ukwa West"] }
    },
    constituencies: [
      { name: "Aba North/Aba South", lgas: ["Aba North", "Aba South"] },
      { name: "Arochukwu/Ohafia", lgas: ["Arochukwu", "Ohafia"] },
      { name: "Bende", lgas: ["Bende"] },
      { name: "Ikwuano/Umuahia North/South", lgas: ["Ikwuano", "Umuahia North", "Umuahia South"] },
      { name: "Isiala Ngwa North/South/Ugwunagbo", lgas: ["Isiala Ngwa North", "Isiala Ngwa South", "Ugwunagbo"] },
      { name: "Isuikwuato/Umunneochi", lgas: ["Isuikwuato", "Umunneochi"] },
      { name: "Obingwa/Osisioma/Ngwa", lgas: ["Obingwa", "Osisioma"] },
      { name: "Ukwa East/West", lgas: ["Ukwa East", "Ukwa West"] }
    ]
  },
  "Adamawa": {
    districts: {
      "Adamawa Central": { lgas: ["Yola North", "Yola South", "Girei", "Fufore", "Song", "Gombi", "Hong"] },
      "Adamawa North": { lgas: ["Mubi North", "Mubi South", "Michika", "Madagali", "Maiha", "Shelleng", "Guyuk"] },
      "Adamawa South": { lgas: ["Numan", "Demsa", "Lamurde", "Jada", "Ganye", "Toungo", "Mayo-Belwa"] }
    },
    constituencies: [
      { name: "Demsa/Numan/Lamurde", lgas: ["Demsa", "Numan", "Lamurde"] },
      { name: "Fufore/Song", lgas: ["Fufore", "Song"] },
      { name: "Ganye/Toungo/Jada/Mayo-Belwa", lgas: ["Ganye", "Toungo", "Jada", "Mayo-Belwa"] },
      { name: "Gombi/Hong", lgas: ["Gombi", "Hong"] },
      { name: "Madagali/Michika", lgas: ["Madagali", "Michika"] },
      { name: "Mubi North/Mubi South/Maiha", lgas: ["Mubi North", "Mubi South", "Maiha"] },
      { name: "Yola North/Yola South/Girei", lgas: ["Yola North", "Yola South", "Girei"] },
      { name: "Shelleng/Guyuk", lgas: ["Shelleng", "Guyuk"] }
    ]
  },
  "Akwa Ibom": {
    districts: {
      "Akwa Ibom North-East": { lgas: ["Uyo", "Ikot Ekpene", "Ini", "Ikono", "Ibiono Ibom", "Itu", "Uruan", "Ibesikpo Asutan", "Nsit Ibom", "Nsit Ubium", "Etinan"] },
      "Akwa Ibom North-West": { lgas: ["Abak", "Essien Udim", "Etim Ekpo", "Ika", "Ikot Abasi", "Mkpat Enin", "Obot Akara", "Oruk Anam", "Ukanafun", "Eastern Obolo"] },
      "Akwa Ibom South": { lgas: ["Eket", "Esit Eket", "Ibeno", "Mbo", "Okobo", "Onna", "Oron", "Udung Uko", "Urue-Offong/Oruko", "Nsit Atai"] }
    },
    constituencies: [
      { name: "Abak/Etim Ekpo/Ika", lgas: ["Abak", "Etim Ekpo", "Ika"] },
      { name: "Eket/Esit Eket/Ibeno/Onna", lgas: ["Eket", "Esit Eket", "Ibeno", "Onna"] },
      { name: "Etinan/Nsit Ibom/Nsit Ubium", lgas: ["Etinan", "Nsit Ibom", "Nsit Ubium"] },
      { name: "Ibesikpo Asutan/Nsit Atai", lgas: ["Ibesikpo Asutan", "Nsit Atai"] },
      { name: "Ikono/Ini", lgas: ["Ikono", "Ini"] },
      { name: "Ikot Abasi/Mkpat Enin/Eastern Obolo", lgas: ["Ikot Abasi", "Mkpat Enin", "Eastern Obolo"] },
      { name: "Ikot Ekpene/Essien Udim/Obot Akara", lgas: ["Ikot Ekpene", "Essien Udim", "Obot Akara"] },
      { name: "Itu/Ibiono Ibom", lgas: ["Itu", "Ibiono Ibom"] },
      { name: "Okobo/Oron/Mbo/Urue-Offong/Oruko/Udung Uko", lgas: ["Okobo", "Oron", "Mbo", "Urue-Offong/Oruko", "Udung Uko"] },
      { name: "Ukanafun/Oruk Anam", lgas: ["Ukanafun", "Oruk Anam"] },
      { name: "Uyo/Uruan", lgas: ["Uyo", "Uruan"] }
    ]
  },
  "Anambra": {
    districts: {
      "Anambra Central": { lgas: ["Awka North", "Awka South", "Anaocha", "Dunukofia", "Njikoka", "Idemili North", "Idemili South"] },
      "Anambra North": { lgas: ["Onitsha North", "Onitsha South", "Ogbaru", "Oyi", "Ayamelum", "Anambra East", "Anambra West"] },
      "Anambra South": { lgas: ["Nnewi North", "Nnewi South", "Ekwusigo", "Ihiala", "Aguata", "Orumba North", "Orumba South"] }
    },
    constituencies: [
      { name: "Aguata", lgas: ["Aguata"] },
      { name: "Anambra East/West", lgas: ["Anambra East", "Anambra West"] },
      { name: "Anaocha/Dunukofia/Njikoka", lgas: ["Anaocha", "Dunukofia", "Njikoka"] },
      { name: "Awka North/South", lgas: ["Awka North", "Awka South"] },
      { name: "Ayamelum/Oyi", lgas: ["Ayamelum", "Oyi"] },
      { name: "Ekwusigo/Ihiala", lgas: ["Ekwusigo", "Ihiala"] },
      { name: "Idemili North/South", lgas: ["Idemili North", "Idemili South"] },
      { name: "Nnewi North/South", lgas: ["Nnewi North", "Nnewi South"] },
      { name: "Ogbaru", lgas: ["Ogbaru"] },
      { name: "Onitsha North/South", lgas: ["Onitsha North", "Onitsha South"] },
      { name: "Orumba North/South", lgas: ["Orumba North", "Orumba South"] }
    ]
  },
  "Bauchi": {
    districts: {
      "Bauchi Central": { lgas: ["Bauchi", "Tafawa Balewa", "Bogoro", "Dass", "Toro", "Alkaleri"] },
      "Bauchi North": { lgas: ["Azare", "Katagum", "Misau", "Giade", "Shira", "Itas/Gadau", "Jama'are", "Zaki"] },
      "Bauchi South": { lgas: ["Kirfi", "Ganjuwa", "Darazo", "Ningi", "Warji", "Dambam"] }
    },
    constituencies: [
      { name: "Alkaleri/Kirfi", lgas: ["Alkaleri", "Kirfi"] },
      { name: "Bauchi", lgas: ["Bauchi"] },
      { name: "Bogoro/Dass/Tafawa Balewa", lgas: ["Bogoro", "Dass", "Tafawa Balewa"] },
      { name: "Dambam/Dagauda/Jama'are", lgas: ["Dambam", "Jama'are"] },
      { name: "Darazo/Ganjuwa", lgas: ["Darazo", "Ganjuwa"] },
      { name: "Giade/Shira", lgas: ["Giade", "Shira"] },
      { name: "Itas/Gadau/Zaki", lgas: ["Itas/Gadau", "Zaki"] },
      { name: "Katagum/Misau", lgas: ["Katagum", "Misau"] },
      { name: "Ningi/Warji", lgas: ["Ningi", "Warji"] },
      { name: "Toro", lgas: ["Toro"] }
    ]
  },
  "Bayelsa": {
    districts: {
      "Bayelsa Central": { lgas: ["Yenagoa", "Kolokuma/Opokuma", "Southern Ijaw"] },
      "Bayelsa East": { lgas: ["Brass", "Nembe", "Ogbia"] },
      "Bayelsa West": { lgas: ["Ekeremor", "Sagbama"] }
    },
    constituencies: [
      { name: "Brass/Nembe", lgas: ["Brass", "Nembe"] },
      { name: "Ekeremor/Sagbama", lgas: ["Ekeremor", "Sagbama"] },
      { name: "Kolokuma/Opokuma/Yenagoa", lgas: ["Kolokuma/Opokuma", "Yenagoa"] },
      { name: "Ogbia", lgas: ["Ogbia"] },
      { name: "Southern Ijaw", lgas: ["Southern Ijaw"] }
    ]
  },
  "Benue": {
    districts: {
      "Benue North-East": { lgas: ["Katsina-Ala", "Ukum", "Logo", "Kwande", "Ushongo", "Vandeikya", "Konshisha"] },
      "Benue North-West": { lgas: ["Gboko", "Tarka", "Buruku", "Makurdi", "Guma", "Gwer East", "Gwer West"] },
      "Benue South": { lgas: ["Otukpo", "Ohimini", "Okpokwu", "Ado", "Agatu", "Apa", "Obi", "Ogbadibo", "Oju"] }
    },
    constituencies: [
      { name: "Ado/Okpokwu/Ogbadibo", lgas: ["Ado", "Okpokwu", "Ogbadibo"] },
      { name: "Agatu/Apa", lgas: ["Agatu", "Apa"] },
      { name: "Buruku", lgas: ["Buruku"] },
      { name: "Gboko/Tarka", lgas: ["Gboko", "Tarka"] },
      { name: "Guma/Makurdi", lgas: ["Guma", "Makurdi"] },
      { name: "Gwer East/Gwer West", lgas: ["Gwer East", "Gwer West"] },
      { name: "Katsina-Ala/Ukum/Logo", lgas: ["Katsina-Ala", "Ukum", "Logo"] },
      { name: "Konshisha/Vandeikya", lgas: ["Konshisha", "Vandeikya"] },
      { name: "Kwande/Ushongo", lgas: ["Kwande", "Ushongo"] },
      { name: "Obi/Oju", lgas: ["Obi", "Oju"] },
      { name: "Otukpo/Ohimini", lgas: ["Otukpo", "Ohimini"] }
    ]
  },
  "Borno": {
    districts: {
      "Borno Central": { lgas: ["Maiduguri", "Jere", "Konduga", "Bama", "Dikwa", "Kala/Balge", "Ngala", "Gwoza", "Damboa"] },
      "Borno North": { lgas: ["Monguno", "Marte", "Mobbar", "Abadam", "Gubio", "Guzamala", "Kukawa", "Nganzai", "Magumeri"] },
      "Borno South": { lgas: ["Biu", "Kwaya Kusar", "Shani", "Askira/Uba", "Hawul", "Chibok", "Damboa", "Kaga"] }
    },
    constituencies: [
      { name: "Askira/Uba/Hawul", lgas: ["Askira/Uba", "Hawul"] },
      { name: "Bama/Ngala/Kala-Balge", lgas: ["Bama", "Ngala", "Kala/Balge"] },
      { name: "Biu/Bayo/Shani/Kwaya Kusar", lgas: ["Biu", "Shani", "Kwaya Kusar"] },
      { name: "Chibok/Damboa", lgas: ["Chibok", "Damboa"] },
      { name: "Dikwa/Marte/Ngala", lgas: ["Dikwa", "Marte"] },
      { name: "Gubio/Kaga/Magumeri", lgas: ["Gubio", "Kaga", "Magumeri"] },
      { name: "Gwoza/Konduga", lgas: ["Gwoza", "Konduga"] },
      { name: "Jere", lgas: ["Jere"] },
      { name: "Kukawa/Mobbar/Abadam/Guzamala", lgas: ["Kukawa", "Mobbar", "Abadam", "Guzamala"] },
      { name: "Maiduguri", lgas: ["Maiduguri"] },
      { name: "Monguno/Marte/Nganzai", lgas: ["Monguno", "Nganzai"] }
    ]
  },
  "Cross River": {
    districts: {
      "Cross River Central": { lgas: ["Abi", "Yakurr", "Obubra", "Ikom", "Etung", "Boki"] },
      "Cross River North": { lgas: ["Ogoja", "Yala", "Obudu", "Obanliku", "Bekwarra", "Obanlikwu"] },
      "Cross River South": { lgas: ["Calabar Municipality", "Calabar South", "Akamkpa", "Biase", "Odukpani", "Bakassi", "Akpabuyo"] }
    },
    constituencies: [
      { name: "Abi/Yakurr", lgas: ["Abi", "Yakurr"] },
      { name: "Akamkpa/Biase", lgas: ["Akamkpa", "Biase"] },
      { name: "Bekwarra/Obudu/Obanliku", lgas: ["Bekwarra", "Obudu", "Obanliku"] },
      { name: "Boki/Ikom", lgas: ["Boki", "Ikom"] },
      { name: "Calabar Municipality/Odukpani", lgas: ["Calabar Municipality", "Odukpani"] },
      { name: "Calabar South/Akpabuyo/Bakassi", lgas: ["Calabar South", "Akpabuyo", "Bakassi"] },
      { name: "Etung/Obubra", lgas: ["Etung", "Obubra"] },
      { name: "Ogoja/Yala", lgas: ["Ogoja", "Yala"] }
    ]
  },
  "Delta": {
    districts: {
      "Delta Central": { lgas: ["Uvwie", "Udu", "Okpe", "Sapele", "Ethiope East", "Ethiope West", "Ughelli North", "Ughelli South"] },
      "Delta North": { lgas: ["Oshimili North", "Oshimili South", "Aniocha North", "Aniocha South", "Ika North East", "Ika South", "Ndokwa East", "Ndokwa West", "Ukwuani"] },
      "Delta South": { lgas: ["Warri North", "Warri South", "Warri South West", "Burutu", "Bomadi", "Patani", "Isoko North", "Isoko South"] }
    },
    constituencies: [
      { name: "Aniocha/Oshimili", lgas: ["Aniocha North", "Aniocha South", "Oshimili North", "Oshimili South"] },
      { name: "Bomadi/Patani", lgas: ["Bomadi", "Patani"] },
      { name: "Burutu", lgas: ["Burutu"] },
      { name: "Ethiope East/West", lgas: ["Ethiope East", "Ethiope West"] },
      { name: "Ika North East/South", lgas: ["Ika North East", "Ika South"] },
      { name: "Isoko North/South", lgas: ["Isoko North", "Isoko South"] },
      { name: "Ndokwa/Ukwuani", lgas: ["Ndokwa East", "Ndokwa West", "Ukwuani"] },
      { name: "Okpe/Sapele/Uvwie", lgas: ["Okpe", "Sapele", "Uvwie"] },
      { name: "Ughelli North/South/Udu", lgas: ["Ughelli North", "Ughelli South", "Udu"] },
      { name: "Warri North/South/South West", lgas: ["Warri North", "Warri South", "Warri South West"] }
    ]
  },
  "Ebonyi": {
    districts: {
      "Ebonyi Central": { lgas: ["Abakaliki", "Izzi", "Ebonyi", "Ishielu"] },
      "Ebonyi North": { lgas: ["Ohaukwu", "Ezza North", "Ezza South", "Ikwo"] },
      "Ebonyi South": { lgas: ["Afikpo North", "Afikpo South", "Ohaozara", "Onicha", "Ivo"] }
    },
    constituencies: [
      { name: "Abakaliki/Izzi", lgas: ["Abakaliki", "Izzi"] },
      { name: "Afikpo North/South", lgas: ["Afikpo North", "Afikpo South"] },
      { name: "Ebonyi/Ohaukwu", lgas: ["Ebonyi", "Ohaukwu"] },
      { name: "Ezza North/South/Ishielu", lgas: ["Ezza North", "Ezza South", "Ishielu"] },
      { name: "Ikwo", lgas: ["Ikwo"] },
      { name: "Ohaozara/Onicha/Ivo", lgas: ["Ohaozara", "Onicha", "Ivo"] }
    ]
  },
  "Edo": {
    districts: {
      "Edo Central": { lgas: ["Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Igueben"] },
      "Edo North": { lgas: ["Etsako Central", "Etsako East", "Etsako West", "Akoko-Edo", "Owan East", "Owan West"] },
      "Edo South": { lgas: ["Oredo", "Egor", "Ikpoba-Okha", "Orhionmwon", "Ovia North-East", "Ovia South-West", "Uhunmwonde"] }
    },
    constituencies: [
      { name: "Akoko-Edo", lgas: ["Akoko-Edo"] },
      { name: "Egor/Ikpoba-Okha", lgas: ["Egor", "Ikpoba-Okha"] },
      { name: "Esan Central/North-East/South-East", lgas: ["Esan Central", "Esan North-East", "Esan South-East"] },
      { name: "Esan West/Igueben", lgas: ["Esan West", "Igueben"] },
      { name: "Etsako", lgas: ["Etsako Central", "Etsako East", "Etsako West"] },
      { name: "Oredo", lgas: ["Oredo"] },
      { name: "Orhionmwon/Uhunmwonde", lgas: ["Orhionmwon", "Uhunmwonde"] },
      { name: "Ovia North-East/South-West", lgas: ["Ovia North-East", "Ovia South-West"] },
      { name: "Owan East/West", lgas: ["Owan East", "Owan West"] }
    ]
  },
  "Ekiti": {
    districts: {
      "Ekiti Central": { lgas: ["Ado Ekiti", "Efon", "Ekiti West", "Ijero", "Irepodun/Ifelodun"] },
      "Ekiti North": { lgas: ["Ikole", "Oye", "Ido/Osi", "Moba", "Ilejemeje"] },
      "Ekiti South": { lgas: ["Ikere", "Ise/Orun", "Emure", "Ekiti South-West", "Ekiti East", "Gbonyin"] }
    },
    constituencies: [
      { name: "Ado Ekiti/Irepodun-Ifelodun", lgas: ["Ado Ekiti", "Irepodun/Ifelodun"] },
      { name: "Efon/Ekiti West/Ijero", lgas: ["Efon", "Ekiti West", "Ijero"] },
      { name: "Ekiti South-West/Ikere/Ise-Orun", lgas: ["Ekiti South-West", "Ikere", "Ise/Orun"] },
      { name: "Emure/Gbonyin/Ekiti East", lgas: ["Emure", "Gbonyin", "Ekiti East"] },
      { name: "Ikole/Oye", lgas: ["Ikole", "Oye"] },
      { name: "Moba/Ido-Osi/Ilejemeje", lgas: ["Moba", "Ido/Osi", "Ilejemeje"] }
    ]
  },
  "Enugu": {
    districts: {
      "Enugu East": { lgas: ["Enugu East", "Enugu North", "Enugu South", "Isi-Uzo", "Nkanu East", "Nkanu West"] },
      "Enugu North": { lgas: ["Nsukka", "Igbo-Eze North", "Igbo-Eze South", "Udenu", "Igbo-Etiti", "Uzo-Uwani"] },
      "Enugu West": { lgas: ["Udi", "Ezeagu", "Awgu", "Aninri", "Oji River"] }
    },
    constituencies: [
      { name: "Aninri/Awgu/Oji River", lgas: ["Aninri", "Awgu", "Oji River"] },
      { name: "Enugu East/Isi-Uzo", lgas: ["Enugu East", "Isi-Uzo"] },
      { name: "Enugu North/South", lgas: ["Enugu North", "Enugu South"] },
      { name: "Igbo-Etiti/Uzo-Uwani", lgas: ["Igbo-Etiti", "Uzo-Uwani"] },
      { name: "Igbo-Eze North/Udenu", lgas: ["Igbo-Eze North", "Udenu"] },
      { name: "Igbo-Eze South/Nsukka", lgas: ["Igbo-Eze South", "Nsukka"] },
      { name: "Nkanu East/West", lgas: ["Nkanu East", "Nkanu West"] },
      { name: "Udi/Ezeagu", lgas: ["Udi", "Ezeagu"] }
    ]
  },
  "Federal Capital Territory": {
    districts: {
      "FCT": { lgas: ["Abaji", "Abuja Municipal", "Bwari", "Gwagwalada", "Kuje", "Kwali"] }
    },
    constituencies: [
      { name: "Abaji/Gwagwalada/Kwali/Kuje", lgas: ["Abaji", "Gwagwalada", "Kwali", "Kuje"] },
      { name: "Bwari/Abuja Municipal", lgas: ["Bwari", "Abuja Municipal"] }
    ]
  },
  "Gombe": {
    districts: {
      "Gombe Central": { lgas: ["Gombe", "Akko", "Yamaltu/Deba", "Kwami"] },
      "Gombe North": { lgas: ["Nafada", "Gombe", "Funakaye", "Dukku"] },
      "Gombe South": { lgas: ["Kaltungo", "Shongom", "Billiri", "Balanga"] }
    },
    constituencies: [
      { name: "Akko", lgas: ["Akko"] },
      { name: "Balanga/Billiri", lgas: ["Balanga", "Billiri"] },
      { name: "Dukku/Nafada", lgas: ["Dukku", "Nafada"] },
      { name: "Funakaye/Kwami", lgas: ["Funakaye", "Kwami"] },
      { name: "Gombe/Kwami", lgas: ["Gombe"] },
      { name: "Kaltungo/Shongom", lgas: ["Kaltungo", "Shongom"] },
      { name: "Yamaltu/Deba", lgas: ["Yamaltu/Deba"] }
    ]
  },
  "Imo": {
    districts: {
      "Imo East": { lgas: ["Owerri Municipal", "Owerri North", "Owerri West", "Mbaitoli", "Ikeduru", "Aboh Mbaise", "Ahiazu Mbaise", "Ezinihitte Mbaise", "Ngor Okpala"] },
      "Imo North": { lgas: ["Okigwe", "Onuimo", "Isiala Mbano", "Ehime Mbano", "Ihitte/Uboma", "Obowo", "Ideato North", "Ideato South", "Nkwerre"] },
      "Imo West": { lgas: ["Orlu", "Orsu", "Oru East", "Oru West", "Njaba", "Isu", "Nwangele", "Oguta", "Ohaji/Egbema"] }
    },
    constituencies: [
      { name: "Aboh Mbaise/Ngor Okpala", lgas: ["Aboh Mbaise", "Ngor Okpala"] },
      { name: "Ahiazu Mbaise/Ezinihitte Mbaise", lgas: ["Ahiazu Mbaise", "Ezinihitte Mbaise"] },
      { name: "Ehime Mbano/Ihitte Uboma/Obowo", lgas: ["Ehime Mbano", "Ihitte/Uboma", "Obowo"] },
      { name: "Ideato North/South", lgas: ["Ideato North", "Ideato South"] },
      { name: "Ikeduru/Mbaitoli", lgas: ["Ikeduru", "Mbaitoli"] },
      { name: "Isiala Mbano/Onuimo/Okigwe", lgas: ["Isiala Mbano", "Onuimo", "Okigwe"] },
      { name: "Nkwerre/Isu/Nwangele/Njaba", lgas: ["Nkwerre", "Isu", "Nwangele", "Njaba"] },
      { name: "Oguta/Ohaji-Egbema", lgas: ["Oguta", "Ohaji/Egbema"] },
      { name: "Orlu/Orsu/Oru East/Oru West", lgas: ["Orlu", "Orsu", "Oru East", "Oru West"] },
      { name: "Owerri Municipal/North/West", lgas: ["Owerri Municipal", "Owerri North", "Owerri West"] }
    ]
  },
  "Jigawa": {
    districts: {
      "Jigawa North-East": { lgas: ["Hadejia", "Kirikasamma", "Malam Madori", "Kafin Hausa", "Auyo", "Guri", "Birniwa", "Kaugama", "Maigatari"] },
      "Jigawa North-West": { lgas: ["Dutse", "Birnin Kudu", "Buji", "Gwaram", "Miga", "Kiyawa", "Jahun", "Gagarawa", "Sule Tankarkar"] },
      "Jigawa South-West": { lgas: ["Kazaure", "Babura", "Garki", "Gumel", "Roni", "Ringim", "Yankwashi", "Taura", "Gwiwa"] }
    },
    constituencies: [
      { name: "Auyo/Kafin Hausa", lgas: ["Auyo", "Kafin Hausa"] },
      { name: "Babura/Garki", lgas: ["Babura", "Garki"] },
      { name: "Biriniwa/Guri/Kaugama", lgas: ["Birniwa", "Guri", "Kaugama"] },
      { name: "Birnin Kudu/Buji", lgas: ["Birnin Kudu", "Buji"] },
      { name: "Dutse/Kiyawa", lgas: ["Dutse", "Kiyawa"] },
      { name: "Gagarawa/Maigatari/Sule Tankarkar", lgas: ["Gagarawa", "Maigatari", "Sule Tankarkar"] },
      { name: "Gumel/Gagarawa/Maigatari", lgas: ["Gumel"] },
      { name: "Gwaram/Miga", lgas: ["Gwaram", "Miga"] },
      { name: "Hadejia/Kirikasamma/Malam Madori", lgas: ["Hadejia", "Kirikasamma", "Malam Madori"] },
      { name: "Jahun/Miga", lgas: ["Jahun"] },
      { name: "Kazaure/Roni/Gwiwa/Yankwashi", lgas: ["Kazaure", "Roni", "Gwiwa", "Yankwashi"] },
      { name: "Ringim/Taura", lgas: ["Ringim", "Taura"] }
    ]
  },
  "Kaduna": {
    districts: {
      "Kaduna Central": { lgas: ["Kaduna North", "Kaduna South", "Chikun", "Igabi", "Birnin Gwari", "Giwa", "Kajuru", "Kachia"] },
      "Kaduna North": { lgas: ["Zaria", "Sabon Gari", "Makarfi", "Kudan", "Soba", "Ikara", "Lere", "Kubau"] },
      "Kaduna South": { lgas: ["Jema'a", "Kaura", "Kagarko", "Jaba", "Sanga", "Zangon Kataf", "Kauru"] }
    },
    constituencies: [
      { name: "Birnin Gwari/Giwa", lgas: ["Birnin Gwari", "Giwa"] },
      { name: "Chikun/Kajuru", lgas: ["Chikun", "Kajuru"] },
      { name: "Igabi", lgas: ["Igabi"] },
      { name: "Ikara/Kubau", lgas: ["Ikara", "Kubau"] },
      { name: "Jaba/Zangon Kataf", lgas: ["Jaba", "Zangon Kataf"] },
      { name: "Jema'a/Sanga", lgas: ["Jema'a", "Sanga"] },
      { name: "Kachia/Kagarko", lgas: ["Kachia", "Kagarko"] },
      { name: "Kaduna North/South", lgas: ["Kaduna North", "Kaduna South"] },
      { name: "Kaura/Kauru", lgas: ["Kaura", "Kauru"] },
      { name: "Kudan/Lere", lgas: ["Kudan", "Lere"] },
      { name: "Makarfi/Sabon Gari", lgas: ["Makarfi", "Sabon Gari"] },
      { name: "Soba", lgas: ["Soba"] },
      { name: "Zaria", lgas: ["Zaria"] }
    ]
  },
  "Kano": {
    districts: {
      "Kano Central": { lgas: ["Kano Municipal", "Nassarawa", "Fagge", "Dala", "Gwale", "Tarauni", "Ungogo", "Kumbotso", "Danbatta", "Makoda", "Gabasawa", "Dawakin Kudu", "Dawakin Tofa", "Tofa", "Rimingado"] },
      "Kano North": { lgas: ["Bichi", "Bagwai", "Shanono", "Tsanyawa", "Kunchi", "Gwarzo", "Kabo", "Karaye", "Rogo", "Minjibir", "Gezawa", "Garun Mallam", "Kibiya", "Rano", "Tudun Wada"] },
      "Kano South": { lgas: ["Wudil", "Garko", "Albasu", "Bebeji", "Kiru", "Madobi", "Doguwa", "Sumaila", "Takai", "Ajingi", "Gaya", "Warawa", "Bunkure", "Dambatta"] }
    },
    constituencies: [
      { name: "Albasu/Gaya", lgas: ["Albasu", "Gaya"] },
      { name: "Bagwai/Shanono", lgas: ["Bagwai", "Shanono"] },
      { name: "Bebeji/Kiru", lgas: ["Bebeji", "Kiru"] },
      { name: "Bichi/Tsanyawa", lgas: ["Bichi", "Tsanyawa"] },
      { name: "Bunkure/Danbatta", lgas: ["Bunkure", "Danbatta"] },
      { name: "Dala/Fagge", lgas: ["Dala", "Fagge"] },
      { name: "Dawakin Kudu/Dawakin Tofa", lgas: ["Dawakin Kudu", "Dawakin Tofa"] },
      { name: "Doguwa/Tudun Wada", lgas: ["Doguwa", "Tudun Wada"] },
      { name: "Gabasawa/Garun Mallam", lgas: ["Gabasawa", "Garun Mallam"] },
      { name: "Gezawa/Minjibir", lgas: ["Gezawa", "Minjibir"] },
      { name: "Gwale/Nassarawa", lgas: ["Gwale", "Nassarawa"] },
      { name: "Gwarzo/Karaye/Rogo", lgas: ["Gwarzo", "Karaye", "Rogo"] },
      { name: "Kabo/Kunchi", lgas: ["Kabo", "Kunchi"] },
      { name: "Kibiya/Rano", lgas: ["Kibiya", "Rano"] },
      { name: "Kumbotso", lgas: ["Kumbotso"] },
      { name: "Madobi/Makoda", lgas: ["Madobi", "Makoda"] },
      { name: "Municipal/Tarauni", lgas: ["Kano Municipal", "Tarauni"] },
      { name: "Rimingado/Tofa", lgas: ["Rimingado", "Tofa"] },
      { name: "Sumaila/Takai", lgas: ["Sumaila", "Takai"] },
      { name: "Ungogo/Warawa", lgas: ["Ungogo", "Warawa"] },
      { name: "Wudil/Garko/Ajingi", lgas: ["Wudil", "Garko", "Ajingi"] }
    ]
  },
  "Katsina": {
    districts: {
      "Katsina Central": { lgas: ["Katsina", "Batagarawa", "Rimi", "Charanchi", "Dan Musa", "Sabuwa", "Malumfashi", "Kafur", "Bakori", "Danja", "Funtua"] },
      "Katsina North": { lgas: ["Daura", "Sandamu", "Mai'Adua", "Mashi", "Dutsi", "Zango", "Baure", "Kusada", "Ingawa", "Kankia", "Kankara", "Mani", "Bindawa"] },
      "Katsina South": { lgas: ["Faskari", "Dandume", "Sabuwa", "Musawa", "Matazu", "Dutsin-Ma", "Kurfi", "Katsina", "Jibia", "Kaita", "Batsari"] }
    },
    constituencies: [
      { name: "Bakori/Danja", lgas: ["Bakori", "Danja"] },
      { name: "Batagarawa/Rimi/Charanchi", lgas: ["Batagarawa", "Rimi", "Charanchi"] },
      { name: "Baure/Zango", lgas: ["Baure", "Zango"] },
      { name: "Daura/Sandamu/Mai'Adua", lgas: ["Daura", "Sandamu", "Mai'Adua"] },
      { name: "Dutsi/Mashi", lgas: ["Dutsi", "Mashi"] },
      { name: "Dutsin-Ma/Kurfi", lgas: ["Dutsin-Ma", "Kurfi"] },
      { name: "Faskari/Dandume/Sabuwa", lgas: ["Faskari", "Dandume", "Sabuwa"] },
      { name: "Funtua/Dan Musa", lgas: ["Funtua", "Dan Musa"] },
      { name: "Ingawa/Kankia/Kusada", lgas: ["Ingawa", "Kankia", "Kusada"] },
      { name: "Jibia/Kaita", lgas: ["Jibia", "Kaita"] },
      { name: "Kafur/Malumfashi", lgas: ["Kafur", "Malumfashi"] },
      { name: "Kankara/Musawa/Matazu", lgas: ["Kankara", "Musawa", "Matazu"] },
      { name: "Katsina", lgas: ["Katsina"] },
      { name: "Mani/Bindawa/Batsari", lgas: ["Mani", "Bindawa", "Batsari"] }
    ]
  },
  "Kebbi": {
    districts: {
      "Kebbi Central": { lgas: ["Birnin Kebbi", "Kalgo", "Bunza", "Arewa Dandi", "Bagudo", "Suru", "Dandi"] },
      "Kebbi North": { lgas: ["Gwandu", "Aliero", "Jega", "Maiyama", "Augie", "Argungu", "Koko/Besse"] },
      "Kebbi South": { lgas: ["Yauri", "Ngaski", "Shanga", "Zuru", "Fakai", "Danko/Wasagu", "Sakaba"] }
    },
    constituencies: [
      { name: "Aliero/Gwandu/Jega", lgas: ["Aliero", "Gwandu", "Jega"] },
      { name: "Arewa/Dandi", lgas: ["Arewa Dandi", "Dandi"] },
      { name: "Argungu/Augie", lgas: ["Argungu", "Augie"] },
      { name: "Bagudo/Suru", lgas: ["Bagudo", "Suru"] },
      { name: "Birnin Kebbi/Kalgo/Bunza", lgas: ["Birnin Kebbi", "Kalgo", "Bunza"] },
      { name: "Koko Besse/Maiyama", lgas: ["Koko/Besse", "Maiyama"] },
      { name: "Ngaski/Shanga/Yauri", lgas: ["Ngaski", "Shanga", "Yauri"] },
      { name: "Zuru/Fakai/Danko-Wasagu/Sakaba", lgas: ["Zuru", "Fakai", "Danko/Wasagu", "Sakaba"] }
    ]
  },
  "Kogi": {
    districts: {
      "Kogi Central": { lgas: ["Okene", "Okehi", "Adavi", "Ajaokuta", "Ogori/Magongo"] },
      "Kogi East": { lgas: ["Dekina", "Bassa", "Ankpa", "Ofu", "Olamaboro", "Idah", "Igalamela-Odolu", "Ibaji", "Omala"] },
      "Kogi West": { lgas: ["Lokoja", "Kogi", "Ijumu", "Kabba/Bunu", "Mopa-Muro", "Yagba East", "Yagba West"] }
    },
    constituencies: [
      { name: "Adavi/Okehi", lgas: ["Adavi", "Okehi"] },
      { name: "Ajaokuta/Ogori-Magongo", lgas: ["Ajaokuta", "Ogori/Magongo"] },
      { name: "Ankpa/Olamaboro/Omala", lgas: ["Ankpa", "Olamaboro", "Omala"] },
      { name: "Bassa/Dekina", lgas: ["Bassa", "Dekina"] },
      { name: "Ibaji/Idah/Igalamela-Odolu", lgas: ["Ibaji", "Idah", "Igalamela-Odolu"] },
      { name: "Ijumu/Kabba-Bunu/Mopa-Muro", lgas: ["Ijumu", "Kabba/Bunu", "Mopa-Muro"] },
      { name: "Kogi/Lokoja", lgas: ["Kogi", "Lokoja"] },
      { name: "Ofu/Igalamela-Odolu", lgas: ["Ofu"] },
      { name: "Okene", lgas: ["Okene"] },
      { name: "Yagba East/West", lgas: ["Yagba East", "Yagba West"] }
    ]
  },
  "Kwara": {
    districts: {
      "Kwara Central": { lgas: ["Ilorin East", "Ilorin South", "Ilorin West", "Asa", "Moro"] },
      "Kwara North": { lgas: ["Edu", "Patigi", "Baruten", "Kaima", "Kaiama"] },
      "Kwara South": { lgas: ["Offa", "Oyun", "Ifelodun", "Irepodun", "Ekiti", "Oke Ero", "Isin"] }
    },
    constituencies: [
      { name: "Asa/Ilorin West", lgas: ["Asa", "Ilorin West"] },
      { name: "Edu/Moro/Patigi", lgas: ["Edu", "Moro", "Patigi"] },
      { name: "Ekiti/Irepodun/Isin/Oke Ero", lgas: ["Ekiti", "Irepodun", "Isin", "Oke Ero"] },
      { name: "Ifelodun/Offa/Oyun", lgas: ["Ifelodun", "Offa", "Oyun"] },
      { name: "Ilorin East/South", lgas: ["Ilorin East", "Ilorin South"] },
      { name: "Baruten/Kaiama", lgas: ["Baruten", "Kaiama"] }
    ]
  },
  "Lagos": {
    districts: {
      "Lagos Central": { lgas: ["Lagos Island", "Lagos Mainland", "Surulere", "Eti-Osa", "Apapa"] },
      "Lagos East": { lgas: ["Ikorodu", "Kosofe", "Shomolu", "Epe", "Ibeju-Lekki"] },
      "Lagos West": { lgas: ["Ikeja", "Alimosho", "Ifako-Ijaiye", "Agege", "Mushin", "Oshodi-Isolo", "Ojo", "Amuwo-Odofin", "Ajeromi-Ifelodun", "Badagry"] }
    },
    constituencies: [
      { name: "Agege", lgas: ["Agege"] },
      { name: "Ajeromi-Ifelodun", lgas: ["Ajeromi-Ifelodun"] },
      { name: "Alimosho", lgas: ["Alimosho"] },
      { name: "Amuwo-Odofin/Ojo", lgas: ["Amuwo-Odofin", "Ojo"] },
      { name: "Badagry", lgas: ["Badagry"] },
      { name: "Epe", lgas: ["Epe"] },
      { name: "Eti-Osa", lgas: ["Eti-Osa"] },
      { name: "Ibeju-Lekki", lgas: ["Ibeju-Lekki"] },
      { name: "Ifako-Ijaiye", lgas: ["Ifako-Ijaiye"] },
      { name: "Ikeja", lgas: ["Ikeja"] },
      { name: "Ikorodu", lgas: ["Ikorodu"] },
      { name: "Kosofe", lgas: ["Kosofe"] },
      { name: "Lagos Island/Apapa", lgas: ["Lagos Island", "Apapa"] },
      { name: "Lagos Mainland", lgas: ["Lagos Mainland"] },
      { name: "Mushin", lgas: ["Mushin"] },
      { name: "Oshodi-Isolo", lgas: ["Oshodi-Isolo"] },
      { name: "Shomolu", lgas: ["Shomolu"] },
      { name: "Surulere", lgas: ["Surulere"] }
    ]
  },
  "Nasarawa": {
    districts: {
      "Nasarawa North": { lgas: ["Akwanga", "Nasarawa Eggon", "Wamba", "Kokona", "Karu"] },
      "Nasarawa South": { lgas: ["Lafia", "Obi", "Doma", "Keana", "Awe"] },
      "Nasarawa West": { lgas: ["Keffi", "Toto", "Nasarawa"] }
    },
    constituencies: [
      { name: "Akwanga/Nasarawa Eggon/Wamba", lgas: ["Akwanga", "Nasarawa Eggon", "Wamba"] },
      { name: "Awe/Doma/Keana", lgas: ["Awe", "Doma", "Keana"] },
      { name: "Karu/Keffi/Kokona", lgas: ["Karu", "Keffi", "Kokona"] },
      { name: "Lafia/Obi", lgas: ["Lafia", "Obi"] },
      { name: "Nasarawa/Toto", lgas: ["Nasarawa", "Toto"] }
    ]
  },
  "Niger": {
    districts: {
      "Niger East": { lgas: ["Suleja", "Tafa", "Gurara", "Paikoro", "Munya", "Rafi", "Shiroro", "Chanchaga", "Bosso"] },
      "Niger North": { lgas: ["Agwara", "Borgu", "Mariga", "Mashegu", "Kontagora", "Magama", "Rijau", "Wushishi"] },
      "Niger South": { lgas: ["Bida", "Gbako", "Katcha", "Lapai", "Agaie", "Lavun", "Mokwa", "Edati"] }
    },
    constituencies: [
      { name: "Agaie/Lapai", lgas: ["Agaie", "Lapai"] },
      { name: "Agwara/Borgu", lgas: ["Agwara", "Borgu"] },
      { name: "Bida/Gbako/Katcha", lgas: ["Bida", "Gbako", "Katcha"] },
      { name: "Bosso/Chanchaga", lgas: ["Bosso", "Chanchaga"] },
      { name: "Gurara/Suleja/Tafa", lgas: ["Gurara", "Suleja", "Tafa"] },
      { name: "Kontagora/Mashegu/Mariga", lgas: ["Kontagora", "Mashegu", "Mariga"] },
      { name: "Lavun/Mokwa/Edati", lgas: ["Lavun", "Mokwa", "Edati"] },
      { name: "Magama/Rijau", lgas: ["Magama", "Rijau"] },
      { name: "Munya/Paikoro/Rafi/Shiroro", lgas: ["Munya", "Paikoro", "Rafi", "Shiroro"] },
      { name: "Wushishi", lgas: ["Wushishi"] }
    ]
  },
  "Ogun": {
    districts: {
      "Ogun Central": { lgas: ["Abeokuta North", "Abeokuta South", "Obafemi Owode", "Odeda", "Ewekoro", "Ifo", "Ado-Odo/Ota"] },
      "Ogun East": { lgas: ["Ijebu North", "Ijebu North East", "Ijebu East", "Ijebu Ode", "Odogbolu", "Ogun Waterside", "Ikenne", "Sagamu", "Remo North"] },
      "Ogun West": { lgas: ["Yewa North", "Yewa South", "Ipokia", "Imeko Afon"] }
    },
    constituencies: [
      { name: "Abeokuta North/Obafemi-Owode", lgas: ["Abeokuta North", "Obafemi Owode"] },
      { name: "Abeokuta South", lgas: ["Abeokuta South"] },
      { name: "Ado-Odo/Ota", lgas: ["Ado-Odo/Ota"] },
      { name: "Ewekoro/Ifo", lgas: ["Ewekoro", "Ifo"] },
      { name: "Ijebu North/East", lgas: ["Ijebu North", "Ijebu East"] },
      { name: "Ijebu North East/Ijebu Ode/Odogbolu", lgas: ["Ijebu North East", "Ijebu Ode", "Odogbolu"] },
      { name: "Ikenne/Sagamu/Remo North", lgas: ["Ikenne", "Sagamu", "Remo North"] },
      { name: "Imeko-Afon/Yewa North", lgas: ["Imeko Afon", "Yewa North"] },
      { name: "Ipokia/Yewa South/Ogun Waterside", lgas: ["Ipokia", "Yewa South", "Ogun Waterside"] },
      { name: "Odeda", lgas: ["Odeda"] }
    ]
  },
  "Ondo": {
    districts: {
      "Ondo Central": { lgas: ["Akure North", "Akure South", "Ifedore", "Idanre", "Ondo East", "Ondo West"] },
      "Ondo North": { lgas: ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Owo", "Ose"] },
      "Ondo South": { lgas: ["Okitipupa", "Irele", "Ese-Odo", "Ilaje", "Odigbo", "Ile Oluji/Okeigbo"] }
    },
    constituencies: [
      { name: "Akoko North-East/North-West", lgas: ["Akoko North-East", "Akoko North-West"] },
      { name: "Akoko South-East/South-West", lgas: ["Akoko South-East", "Akoko South-West"] },
      { name: "Akure North/South", lgas: ["Akure North", "Akure South"] },
      { name: "Ese-Odo/Irele/Okitipupa", lgas: ["Ese-Odo", "Irele", "Okitipupa"] },
      { name: "Idanre/Ifedore", lgas: ["Idanre", "Ifedore"] },
      { name: "Ilaje/Odigbo", lgas: ["Ilaje", "Odigbo"] },
      { name: "Ile Oluji/Okeigbo/Ondo East/West", lgas: ["Ile Oluji/Okeigbo", "Ondo East", "Ondo West"] },
      { name: "Ose/Owo", lgas: ["Ose", "Owo"] }
    ]
  },
  "Osun": {
    districts: {
      "Osun Central": { lgas: ["Osogbo", "Olorunda", "Ifelodun", "Boripe", "Boluwaduro", "Odo-Otin", "Ila", "Ifedayo", "Irepodun", "Orolu"] },
      "Osun East": { lgas: ["Ilesa East", "Ilesa West", "Atakunmosa East", "Atakunmosa West", "Obokun", "Oriade", "Ife Central", "Ife East", "Ife North", "Ife South"] },
      "Osun West": { lgas: ["Ede North", "Ede South", "Ejigbo", "Ola Oluwa", "Iwo", "Irewole", "Isokan", "Ayedaade", "Ayedire", "Egbedore"] }
    },
    constituencies: [
      { name: "Atakunmosa East/West/Ilesa East/West", lgas: ["Atakunmosa East", "Atakunmosa West", "Ilesa East", "Ilesa West"] },
      { name: "Ayedaade/Ayedire/Irewole/Isokan", lgas: ["Ayedaade", "Ayedire", "Irewole", "Isokan"] },
      { name: "Boluwaduro/Boripe/Ifelodun", lgas: ["Boluwaduro", "Boripe", "Ifelodun"] },
      { name: "Ede North/South/Ejigbo/Egbedore", lgas: ["Ede North", "Ede South", "Ejigbo", "Egbedore"] },
      { name: "Ife Central/East/North/South", lgas: ["Ife Central", "Ife East", "Ife North", "Ife South"] },
      { name: "Ifedayo/Ila/Odo-Otin", lgas: ["Ifedayo", "Ila", "Odo-Otin"] },
      { name: "Irepodun/Orolu/Olorunda/Osogbo", lgas: ["Irepodun", "Orolu", "Olorunda", "Osogbo"] },
      { name: "Iwo/Ola Oluwa", lgas: ["Iwo", "Ola Oluwa"] },
      { name: "Obokun/Oriade", lgas: ["Obokun", "Oriade"] }
    ]
  },
  "Oyo": {
    districts: {
      "Oyo Central": { lgas: ["Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Akinyele", "Egbeda", "Lagelu", "Ona Ara", "Oluyole", "Ido"] },
      "Oyo North": { lgas: ["Oyo East", "Oyo West", "Atiba", "Afijio", "Ogbomosho North", "Ogbomosho South", "Orire", "Ogo Oluwa", "Surulere", "Saki East", "Saki West", "Atisbo", "Itesiwaju", "Iwajowa", "Kajola", "Iseyin", "Irepo", "Olorunsogo"] },
      "Oyo South": { lgas: ["Ibarapa Central", "Ibarapa East", "Ibarapa North", "Oorelope"] }
    },
    constituencies: [
      { name: "Afijio/Atiba/Oyo East/Oyo West", lgas: ["Afijio", "Atiba", "Oyo East", "Oyo West"] },
      { name: "Akinyele/Lagelu", lgas: ["Akinyele", "Lagelu"] },
      { name: "Egbeda/Ona Ara", lgas: ["Egbeda", "Ona Ara"] },
      { name: "Ibarapa Central/North", lgas: ["Ibarapa Central", "Ibarapa North"] },
      { name: "Ibarapa East/Ido", lgas: ["Ibarapa East", "Ido"] },
      { name: "Ibadan North", lgas: ["Ibadan North"] },
      { name: "Ibadan North-East/South-East", lgas: ["Ibadan North-East", "Ibadan South-East"] },
      { name: "Ibadan North-West/South-West", lgas: ["Ibadan North-West", "Ibadan South-West"] },
      { name: "Irepo/Olorunsogo/Oorelope", lgas: ["Oorelope"] },
      { name: "Iseyin/Itesiwaju/Iwajowa/Kajola", lgas: ["Iseyin", "Itesiwaju", "Iwajowa", "Kajola"] },
      { name: "Ogbomosho North/South/Orire", lgas: ["Ogbomosho North", "Ogbomosho South", "Orire"] },
      { name: "Ogo Oluwa/Surulere", lgas: ["Ogo Oluwa", "Surulere"] },
      { name: "Oluyole", lgas: ["Oluyole"] },
      { name: "Saki East/Saki West/Atisbo", lgas: ["Saki East", "Saki West", "Atisbo"] }
    ]
  },
  "Plateau": {
    districts: {
      "Plateau Central": { lgas: ["Jos North", "Jos South", "Jos East", "Bassa", "Riyom"] },
      "Plateau North": { lgas: ["Barkin Ladi", "Bokkos", "Mangu", "Pankshin", "Kanke", "Kanam"] },
      "Plateau South": { lgas: ["Shendam", "Langtang North", "Langtang South", "Wase", "Mikang", "Qua'an Pan"] }
    },
    constituencies: [
      { name: "Barkin Ladi/Riyom", lgas: ["Barkin Ladi", "Riyom"] },
      { name: "Bassa/Jos North", lgas: ["Bassa", "Jos North"] },
      { name: "Bokkos/Mangu", lgas: ["Bokkos", "Mangu"] },
      { name: "Jos South/Jos East", lgas: ["Jos South", "Jos East"] },
      { name: "Kanam/Wase", lgas: ["Kanam", "Wase"] },
      { name: "Langtang North/South", lgas: ["Langtang North", "Langtang South"] },
      { name: "Pankshin/Kanke", lgas: ["Pankshin", "Kanke"] },
      { name: "Shendam/Mikang/Qua'an Pan", lgas: ["Shendam", "Mikang", "Qua'an Pan"] }
    ]
  },
  "Rivers": {
    districts: {
      "Rivers East": { lgas: ["Port Harcourt", "Obio/Akpor", "Ikwerre", "Emohua", "Etche", "Omuma", "Oyigbo", "Eleme"] },
      "Rivers South-East": { lgas: ["Gokana", "Khana", "Tai", "Bonny", "Degema", "Ogu/Bolo", "Okrika", "Andoni"] },
      "Rivers West": { lgas: ["Ogba/Egbema/Ndoni", "Ahoada East", "Ahoada West", "Abua/Odual", "Asari-Toru", "Akuku-Toru", "Opobo/Nkoro"] }
    },
    constituencies: [
      { name: "Abua/Odual/Ahoada East/West", lgas: ["Abua/Odual", "Ahoada East", "Ahoada West"] },
      { name: "Akuku-Toru/Asari-Toru", lgas: ["Akuku-Toru", "Asari-Toru"] },
      { name: "Andoni/Opobo-Nkoro", lgas: ["Andoni", "Opobo/Nkoro"] },
      { name: "Bonny/Degema", lgas: ["Bonny", "Degema"] },
      { name: "Eleme/Oyigbo/Tai", lgas: ["Eleme", "Oyigbo", "Tai"] },
      { name: "Emohua/Ikwerre", lgas: ["Emohua", "Ikwerre"] },
      { name: "Etche/Omuma", lgas: ["Etche", "Omuma"] },
      { name: "Gokana/Khana", lgas: ["Gokana", "Khana"] },
      { name: "Obio/Akpor", lgas: ["Obio/Akpor"] },
      { name: "Ogba/Egbema/Ndoni", lgas: ["Ogba/Egbema/Ndoni"] },
      { name: "Ogu/Bolo/Okrika", lgas: ["Ogu/Bolo", "Okrika"] },
      { name: "Port Harcourt", lgas: ["Port Harcourt"] }
    ]
  },
  "Sokoto": {
    districts: {
      "Sokoto East": { lgas: ["Sokoto North", "Sokoto South", "Wamako", "Dange Shuni", "Bodinga", "Yabo", "Shagari", "Kware"] },
      "Sokoto North": { lgas: ["Wurno", "Rabah", "Goronyo", "Gada", "Sabon Birni", "Illela", "Gwadabawa", "Isa"] },
      "Sokoto South": { lgas: ["Tangaza", "Gudu", "Kebbe", "Tambuwal", "Tureta", "Binji", "Silame"] }
    },
    constituencies: [
      { name: "Binji/Silame/Gudu/Tangaza", lgas: ["Binji", "Silame", "Gudu", "Tangaza"] },
      { name: "Bodinga/Dange-Shuni/Tureta", lgas: ["Bodinga", "Dange Shuni", "Tureta"] },
      { name: "Gada/Goronyo", lgas: ["Gada", "Goronyo"] },
      { name: "Gwadabawa/Illela", lgas: ["Gwadabawa", "Illela"] },
      { name: "Isa/Sabon Birni", lgas: ["Isa", "Sabon Birni"] },
      { name: "Kebbe/Tambuwal", lgas: ["Kebbe", "Tambuwal"] },
      { name: "Kware/Wamako", lgas: ["Kware", "Wamako"] },
      { name: "Rabah/Wurno", lgas: ["Rabah", "Wurno"] },
      { name: "Shagari/Yabo", lgas: ["Shagari", "Yabo"] },
      { name: "Sokoto North/South", lgas: ["Sokoto North", "Sokoto South"] }
    ]
  },
  "Taraba": {
    districts: {
      "Taraba Central": { lgas: ["Jalingo", "Yorro", "Zing", "Ardo-Kola", "Lau", "Karim-Lamido"] },
      "Taraba North": { lgas: ["Bali", "Gassol", "Gashaka", "Kurmi", "Sardauna"] },
      "Taraba South": { lgas: ["Wukari", "Ibi", "Donga", "Takum", "Ussa"] }
    },
    constituencies: [
      { name: "Ardo Kola/Karim-Lamido/Lau", lgas: ["Ardo-Kola", "Karim-Lamido", "Lau"] },
      { name: "Bali/Gassol", lgas: ["Bali", "Gassol"] },
      { name: "Donga/Ussa/Takum", lgas: ["Donga", "Ussa", "Takum"] },
      { name: "Gashaka/Kurmi/Sardauna", lgas: ["Gashaka", "Kurmi", "Sardauna"] },
      { name: "Ibi/Wukari", lgas: ["Ibi", "Wukari"] },
      { name: "Jalingo/Yorro/Zing", lgas: ["Jalingo", "Yorro", "Zing"] }
    ]
  },
  "Yobe": {
    districts: {
      "Yobe East": { lgas: ["Damaturu", "Gujba", "Gulani", "Tarmuwa", "Potiskum", "Nangere", "Fika"] },
      "Yobe North": { lgas: ["Nguru", "Machina", "Yusufari", "Bade", "Jakusko", "Karasuwa"] },
      "Yobe South": { lgas: ["Bursari", "Geidam", "Yunusari", "Damaturu"] }
    },
    constituencies: [
      { name: "Bade/Jakusko", lgas: ["Bade", "Jakusko"] },
      { name: "Bursari/Geidam/Yunusari", lgas: ["Bursari", "Geidam", "Yunusari"] },
      { name: "Damaturu/Gujba/Gulani/Tarmuwa", lgas: ["Damaturu", "Gujba", "Gulani", "Tarmuwa"] },
      { name: "Fika/Fune", lgas: ["Fika"] },
      { name: "Machina/Nguru/Karasuwa/Yusufari", lgas: ["Machina", "Nguru", "Karasuwa", "Yusufari"] },
      { name: "Nangere/Potiskum", lgas: ["Nangere", "Potiskum"] }
    ]
  },
  "Zamfara": {
    districts: {
      "Zamfara Central": { lgas: ["Gusau", "Bungudu", "Maru", "Tsafe", "Talata Mafara"] },
      "Zamfara North": { lgas: ["Kaura Namoda", "Birnin Magaji/Kiyaw", "Zurmi", "Shinkafi"] },
      "Zamfara West": { lgas: ["Anka", "Bakura", "Bukkuyum", "Gummi", "Maradun"] }
    },
    constituencies: [
      { name: "Anka/Talata Mafara", lgas: ["Anka", "Talata Mafara"] },
      { name: "Bakura/Maradun", lgas: ["Bakura", "Maradun"] },
      { name: "Birnin Magaji/Shinkafi", lgas: ["Birnin Magaji/Kiyaw", "Shinkafi"] },
      { name: "Bukkuyum/Gummi", lgas: ["Bukkuyum", "Gummi"] },
      { name: "Bungudu/Maru", lgas: ["Bungudu", "Maru"] },
      { name: "Gusau/Tsafe", lgas: ["Gusau", "Tsafe"] },
      { name: "Kaura Namoda/Zurmi", lgas: ["Kaura Namoda", "Zurmi"] }
    ]
  }
};

async function seedElectoralGeography() {
  console.log("Starting electoral geography seeding...");

  const statesResult = await db.execute(sql`SELECT id, name FROM states ORDER BY name`);
  const statesMap = new Map<string, string>();
  for (const row of statesResult.rows as any[]) {
    statesMap.set(row.name, row.id);
  }

  const lgasResult = await db.execute(sql`SELECT id, name, state_id FROM lgas ORDER BY name`);
  const lgasByState = new Map<string, Map<string, string>>();
  for (const row of lgasResult.rows as any[]) {
    if (!lgasByState.has(row.state_id)) lgasByState.set(row.state_id, new Map());
    lgasByState.get(row.state_id)!.set(row.name, row.id);
  }

  const sdResult = await db.execute(sql`SELECT id, district_name, state_id FROM senatorial_districts ORDER BY district_name`);
  const sdByState = new Map<string, Map<string, string>>();
  for (const row of sdResult.rows as any[]) {
    if (!sdByState.has(row.state_id)) sdByState.set(row.state_id, new Map());
    sdByState.get(row.state_id)!.set(row.district_name, row.id);
  }

  let totalConstituencies = 0;
  let totalLgasMapped = 0;
  let unmappedLgas: string[] = [];

  for (const [stateName, data] of Object.entries(NIGERIA_ELECTORAL_MAP)) {
    const stateId = statesMap.get(stateName);
    if (!stateId) {
      console.log(`WARNING: State '${stateName}' not found in DB`);
      continue;
    }

    const stateLgas = lgasByState.get(stateId) || new Map();
    const stateDistricts = sdByState.get(stateId) || new Map();

    for (const [districtName, districtData] of Object.entries(data.districts)) {
      const districtId = stateDistricts.get(districtName);
      if (!districtId) {
        console.log(`WARNING: District '${districtName}' not found for state '${stateName}'`);
        continue;
      }

      for (const lgaName of districtData.lgas) {
        const lgaId = stateLgas.get(lgaName);
        if (lgaId) {
          await db.execute(sql`UPDATE lgas SET senatorial_district_id = ${districtId} WHERE id = ${lgaId}`);
          totalLgasMapped++;
        } else {
          unmappedLgas.push(`${stateName}/${lgaName}`);
        }
      }
    }

    const stateCode = stateName.substring(0, 2).toUpperCase().replace(/\s/g, '');
    let fcIdx = 1;
    for (const fc of data.constituencies) {
      const fcCode = `${stateCode}-FC${String(fcIdx).padStart(2, '0')}`;

      const districtForFc = Object.entries(data.districts).find(([_, d]) =>
        d.lgas.some(l => fc.lgas.includes(l))
      );
      const districtId = districtForFc ? stateDistricts.get(districtForFc[0]) : null;

      const result = await db.execute(sql`
        INSERT INTO federal_constituencies (code, state_id, senatorial_district_id, name)
        VALUES (${fcCode}, ${stateId}, ${districtId || null}, ${fc.name})
        ON CONFLICT (code) DO UPDATE SET name = ${fc.name}, senatorial_district_id = ${districtId || null}
        RETURNING id
      `);
      const fcId = (result.rows[0] as any).id;

      for (const lgaName of fc.lgas) {
        const lgaId = stateLgas.get(lgaName);
        if (lgaId) {
          await db.execute(sql`UPDATE lgas SET federal_constituency_id = ${fcId} WHERE id = ${lgaId}`);
        }
      }

      fcIdx++;
      totalConstituencies++;
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`Federal constituencies created: ${totalConstituencies}`);
  console.log(`LGAs mapped to senatorial districts: ${totalLgasMapped}`);
  if (unmappedLgas.length > 0) {
    console.log(`\nUnmapped LGAs (${unmappedLgas.length}):`);
    unmappedLgas.forEach(l => console.log(`  - ${l}`));
  }

  const verifyFc = await db.execute(sql`SELECT COUNT(*) as count FROM federal_constituencies`);
  const verifyLgaSd = await db.execute(sql`SELECT COUNT(*) as count FROM lgas WHERE senatorial_district_id IS NOT NULL`);
  const verifyLgaFc = await db.execute(sql`SELECT COUNT(*) as count FROM lgas WHERE federal_constituency_id IS NOT NULL`);
  console.log(`\nVerification:`);
  console.log(`  Federal constituencies in DB: ${(verifyFc.rows[0] as any).count}`);
  console.log(`  LGAs with senatorial district: ${(verifyLgaSd.rows[0] as any).count}`);
  console.log(`  LGAs with federal constituency: ${(verifyLgaFc.rows[0] as any).count}`);
}

seedElectoralGeography()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
